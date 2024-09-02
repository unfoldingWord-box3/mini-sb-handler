const {parentPort} = require("node:worker_threads");
const {
    entryHasGenerated,
    initializeEntryBookResourceCategory,
    writeEntryBookResource,
} = require('../dataLayers/fs');

function doScripturePerf({config, org, pk, metadata, doc, docSetId, verbose}) {
    // Make Perf, also simplePerf and stats which are derived from the perf
    try {
        const docResult = pk.gqlQuerySync(`{ document(id: """${doc.id}""") { bookCode: header(id:"bookCode") perf } }`).data.document;
        if (!entryHasGenerated(config, org, metadata.id, metadata.revision, "perfBooks")) {
            initializeEntryBookResourceCategory(
                config,
                org,
                metadata.id,
                metadata.revision,
                "generated",
                "perfBooks"
            );
        }
        writeEntryBookResource(
            config,
            org,
            metadata.id,
            metadata.revision,
            "perfBooks",
            `${doc.book}.json`,
            JSON.parse(docResult.perf)
        );
        if (verbose) {
            parentPort.postMessage({
                    org,
                    transId: metadata.id,
                    revision: metadata.revision,
                    book: doc.book,
                    status: "perf"
                }
            )
        }
    } catch (err) {
        parentPort.postMessage({
            generatedBy: 'cron',
            context: {
                docSetId,
                doc: doc.id,
                book: doc.book,
                making: "perf"
            },
            message: err.message,
        });
        return false;
    }
    return true;
}

module.exports = doScripturePerf;
