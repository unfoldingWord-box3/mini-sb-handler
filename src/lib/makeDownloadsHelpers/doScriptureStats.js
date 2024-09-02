const {PerfRenderFromProskomma} = require('proskomma-json-tools');
const documentStatsActions = require("../documentStatsActions");
const {parentPort} = require("node:worker_threads");

function doScriptureStats({org, pk, metadata, doc, docSetId, stats, verbose}) {
    try {
        const cl = new PerfRenderFromProskomma(
            {
                proskomma: pk,
                actions: documentStatsActions,
            },
        );
        const output = {};

        cl.renderDocument(
            {
                docId: doc.id,
                config: {},
                output,
            },
        );
        stats.documents[doc.book] = output;
        if (verbose) {
            parentPort.postMessage({
                org,
                transId: metadata.id,
                revision: metadata.revision,
                book: doc.book,
                status: "stats"
            })
        }
    } catch (err) {
        if (verbose) {
            parentPort.postMessage({
                generatedBy: 'cron',
                context: {
                    docSetId,
                    doc: doc.id,
                    book: doc.book,
                    making: "stats"
                },
                message: err.message,
            });
        }
    }
}

module.exports = doScriptureStats;
