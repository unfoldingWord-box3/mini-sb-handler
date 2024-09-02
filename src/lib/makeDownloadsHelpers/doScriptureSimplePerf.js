const {entryHasGenerated, initializeEntryBookResourceCategory, writeEntryBookResource} = require("../dataLayers/fs");
const {parentPort} = require("node:worker_threads");
const {PerfRenderFromProskomma, render, mergeActions} = require('proskomma-json-tools');

function doScriptureSimplePerf({config, org, pk, metadata, doc, docSetId, verbose}) {
    try {
        const cl = new PerfRenderFromProskomma(
            {
                proskomma: pk,
                actions: mergeActions(
                    [
                        render.perfToPerf.renderActions.justTheBibleActions,
                        render.perfToPerf.renderActions.identityActions
                    ]
                ),
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
        const mergedText = render.perfToPerf.transforms.mergePerfText.code({perf: output.perf}).perf;
        if (!entryHasGenerated(config, org, metadata.id, metadata.revision, "simplePerfBooks")) {
            initializeEntryBookResourceCategory(
                config,
                org,
                metadata.id,
                metadata.revision,
                "generated",
                "simplePerfBooks"
            );
        }
        writeEntryBookResource(
            config,
            org,
            metadata.id,
            metadata.revision,
            "simplePerfBooks",
            `${doc.book}.json`,
            mergedText
        );
        if (verbose) {
            parentPort.postMessage({
                org,
                transId: metadata.id,
                revision: metadata.revision,
                book: doc.book,
                status: "simplePerf"
            })
        }
    } catch (err) {
        parentPort.postMessage({
            generatedBy: 'cron',
            context: {
                docSetId,
                doc: doc.id,
                book: doc.book,
                making: "simplePerf"
            },
            message: err.message,
        });
    }
}

module.exports = doScriptureSimplePerf;
