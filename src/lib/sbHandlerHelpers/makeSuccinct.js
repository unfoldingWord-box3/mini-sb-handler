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

function getSuccinct({pk, metadata, idStr, verbose}) {
    let docSetId;
    const bookResources = Object.keys(metadata.ingredients)
    const bookContent = bookResources.filter(r => r.endsWith('.usfm')).map(r => readEntryBookResource(r));
    pk.importDocuments(
        {
            source: "codex",
            project: idStr,
            bpkgVersion: "1.0",
        },
        "usfm",
        bookContent,
    );
    const docSet = pk.gqlQuerySync('{docSets { id documents { bookCode: header(id: "bookCode") sequences {type} } } }').data.docSets[0];
    docSetId = docSet.id;
    // const docSetBookCodes = docSet.documents.map(d => d.bookCode);
    // for (const bookCode of docSetBookCodes) {
    //     for (const section of ['ot', 'nt', 'dc']) {
    //         if (ptBooks[bookCode].categories.includes(section)) {
    //             stats[`n${section.toUpperCase()}`]++;
    //         }
    //     }
    // }
    // console.log(docSet)
    // let metadataTags = `"title:${metadata.title}" "copyright:${metadata.copyright}" "language:${metadata.languageCode}" """owner:${metadata.owner}"""`;
    // metadataTags += ` "nOT:${stats.nOT}" "nNT:${stats.nNT}" "nDC:${stats.nDC}"`;
    // if (metadata.textDirection) {
    //     metadataTags += ` "direction:${metadata.textDirection}"`;
    // }
    // if (metadata.script) {
    //     metadataTags += ` "script:${metadata.script}"`;
    // }
    // pk.gqlQuerySync(`mutation { addDocSetTags(docSetId: "${docSetId}", tags: [${metadataTags}]) }`);
    // if (entryHas(config, org, metadata.id, metadata.revision, "versification.vrs")) {
    //     const vrsContent = readEntryResource(config, org, metadata.id, metadata.revision, "versification.vrs");
    //     pk.gqlQuerySync(`mutation { setVerseMapping(docSetId: "${docSetId}" vrsSource: """${vrsContent}""")}`);
    // }

    let metadataTags = `"title:${metadata.title}" "copyright:${metadata.copyright}" "language:${metadata.languageCode}" """owner:${metadata.owner}"""`;
    if (metadata.textDirection) {
        metadataTags += ` "direction:${metadata.textDirection}"`;
    }
    if (metadata.script) {
        metadataTags += ` "script:${metadata.script}"`;
    }
    pk.gqlQuerySync(`mutation { addDocSetTags(docSetId: "${docSetId}", tags: [${metadataTags}]) }`);
    const succinct = pk.serializeSuccinct(docSetId);
    writeEntryResource(succinct,`${idStr}.bpkg`);
    console.log("finished successfully")

    if (verbose) {
        parentPort.postMessage({
            idStr,
            transId: metadata.id,
            // revision: metadata.revision,
            status: "getSuccinct"
        })
    }
}

module.exports = getSuccinct;
