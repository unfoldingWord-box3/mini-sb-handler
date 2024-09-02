const {entryHasGenerated, initializeEntryBookResourceCategory, writeEntryBookResource} = require("../dataLayers/fs");
const {parentPort} = require("node:worker_threads");

function doScriptureSofria({config, org, pk, metadata, doc, docSetId, verbose}) {
    try {
        const docResult = pk.gqlQuerySync(`{document(id: """${doc.id}""") { bookCode: header(id:"bookCode") sofria } }`).data.document;
        if (!entryHasGenerated(config, org, metadata.id, metadata.revision, "sofriaBooks")) {
            initializeEntryBookResourceCategory(
                config,
                org,
                metadata.id,
                metadata.revision,
                "generated",
                "sofriaBooks"
            );
        }
        writeEntryBookResource(
            config,
            org,
            metadata.id,
            metadata.revision,
            "sofriaBooks",
            `${doc.book}.json`,
            JSON.parse(docResult.sofria)
        );
        if (verbose) {
            parentPort.postMessage({
                org,
                transId: metadata.id,
                revision: metadata.revision,
                book: doc.book,
                status: "sofria"
            });
        }
    } catch (err) {
        parentPort.postMessage({
            generatedBy: 'cron',
            context: {
                docSetId,
                doc: doc.id,
                book: doc.book,
                making: "sofria"
            },
            message: err.message,
        });
    }
}

module.exports = doScriptureSofria;
