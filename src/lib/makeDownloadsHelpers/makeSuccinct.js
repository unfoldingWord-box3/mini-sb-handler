const {
    entryHas,
    readEntryResource,
    entryBookResourcesForCategory,
    readEntryBookResource,
    writeEntryResource
} = require("../dataLayers/fs");
const {ptBooks} = require('proskomma-utils');
const {parentPort} = require("node:worker_threads");
const path = require("path");

function getSuccinct({config, org, pk, metadata, contentType, stats, verbose}) {
    let docSetId;
    if (entryHas(config, org, metadata.id, metadata.revision, "succinct.json")) {
        // Load existing succinct and extract book stats info from it
        const succinct = readEntryResource(config, org, metadata.id, metadata.revision, "succinct.json");
        pk.loadSuccinctDocSet(succinct);
        const docSetTags = pk.gqlQuerySync('{docSets { tagsKv {key value} } }').data.docSets[0].tagsKv;
        for (const kv of docSetTags) {
            if (["nOT", "nNT", "nDC"].includes(kv.key)) {
                stats[kv.key] = kv.value;
            }
        }
    } else {
        // Load books, calculate section stats from books and add this and other tags to docSet, then export succinct
        if (["usfm", "usx", "succinct"].includes(contentType)) {
            const bookResources = entryBookResourcesForCategory(config, org, metadata.id, metadata.revision, `${contentType}Books`);
            const bookContent = bookResources.map(r => readEntryBookResource(config, org, metadata.id, metadata.revision, `${contentType}Books`, r));
            pk.importDocuments(
                {
                    source: org,
                    project: metadata.id,
                    revision: metadata.revision,
                },
                contentType,
                bookContent,
            );
            const docSet = pk.gqlQuerySync('{docSets { id documents { bookCode: header(id: "bookCode") sequences {type} } } }').data.docSets[0];
            docSetId = docSet.id;
            const docSetBookCodes = docSet.documents.map(d => d.bookCode);
            for (const bookCode of docSetBookCodes) {
                for (const section of ['ot', 'nt', 'dc']) {
                    if (ptBooks[bookCode].categories.includes(section)) {
                        stats[`n${section.toUpperCase()}`]++;
                    }
                }
            }
            let metadataTags = `"title:${metadata.title}" "copyright:${metadata.copyright}" "language:${metadata.languageCode}" """owner:${metadata.owner}"""`;
            metadataTags += ` "nOT:${stats.nOT}" "nNT:${stats.nNT}" "nDC:${stats.nDC}"`;
            if (metadata.textDirection) {
                metadataTags += ` "direction:${metadata.textDirection}"`;
            }
            if (metadata.script) {
                metadataTags += ` "script:${metadata.script}"`;
            }
            pk.gqlQuerySync(`mutation { addDocSetTags(docSetId: "${docSetId}", tags: [${metadataTags}]) }`);
            if (entryHas(config, org, metadata.id, metadata.revision, "versification.vrs")) {
                const vrsContent = readEntryResource(config, org, metadata.id, metadata.revision, "versification.vrs");
                pk.gqlQuerySync(`mutation { setVerseMapping(docSetId: "${docSetId}" vrsSource: """${vrsContent}""")}`);
            }
        } else if (["uwNotes", "tyndaleStudyNotes"].includes(contentType)) {
            const tsvToTable = (tsv, hasHeadings) => {
                const ret = {
                    headings: [],
                    rows: [],
                };
                let rows = tsv.split(/[\n\r]+/);

                if (hasHeadings) {
                    ret.headings = rows[0].split('\t');
                    rows = rows.slice(1);
                }

                for (const row of rows) {
                    const cells = row.split('\t');
                    let newRow = [cells[0], cells[1]];
                    if (cells[7]) {
                        newRow.push(cells[2]);
                        newRow.push(cells[7]);
                    } else if (cells[2]) {
                        newRow.push(cells[2]);
                        newRow.push(cells[3]);
                    }
                    ret.rows.push(newRow);
                }
                return ret;
            };
            let t00;
            if (contentType === 'uwNotes') {
                const bookResources = entryBookResourcesForCategory(config, org, metadata.id, metadata.revision, `${contentType}Books`);
                const bookContent = bookResources.map(
                    r => [r.split('.')[0], readEntryBookResource(config, org, metadata.id, metadata.revision, `${contentType}Books`, r)]
                );
                const booksContent = bookContent
                    .map(
                        bc => bc[1].split('\n')
                            .slice(1)
                            .map(
                                l => {
                                    let cells = l.split('\t');
                                    cells[0] = bc[0] + " " + cells[0];
                                    cells.unshift(cells[0]);
                                    return cells.join('\t');
                                }
                            )
                            .join('\n')
                    )
                    .join('\n');
                t00 = tsvToTable(
                    booksContent,
                    false,
                );
            } else {
                t00 = tsvToTable(
                    readEntryResource(config, org, metadata.id, metadata.revision, "studyNotes.tsv"),
                    false
                );
            }
            const bcvIds = {};
            for (const row of t00.rows) {
                const bcv = row[0];
                if (!bcvIds[bcv]) {
                    bcvIds[bcv] = [];
                }
                bcvIds[bcv].push(row[2]);
            }
            const t01 = tsvToTable(
                Object.entries(bcvIds)
                    .map(
                        kv => `${kv[0]}\t${kv[1].join(',')}`
                    ).join('\n'),
                false
            )
            pk.importDocuments({
                    source: org,
                    project: metadata.id,
                    revision: metadata.revision,
                },
                'tsv',
                [
                    JSON.stringify(t00),
                    JSON.stringify(t01)
                ]
            )
        }
        const docSet = pk.gqlQuerySync('{docSets { id documents { bookCode: header(id: "bookCode") sequences {type} } } }').data.docSets[0];
        docSetId = docSet.id;
        let metadataTags = `"title:${metadata.title}" "copyright:${metadata.copyright}" "language:${metadata.languageCode}" """owner:${metadata.owner}"""`;
        if (metadata.textDirection) {
            metadataTags += ` "direction:${metadata.textDirection}"`;
        }
        if (metadata.script) {
            metadataTags += ` "script:${metadata.script}"`;
        }
        pk.gqlQuerySync(`mutation { addDocSetTags(docSetId: "${docSetId}", tags: [${metadataTags}]) }`);
        const succinct = pk.serializeSuccinct(docSetId);
        writeEntryResource(config, org, metadata.id, metadata.revision, "generated", "succinct.json", succinct);
    }
    if (verbose) {
        parentPort.postMessage({
                org,
                transId: metadata.id,
                revision: metadata.revision,
                status: "getSuccinct"
            }
        )
    }
}

module.exports = getSuccinct;
