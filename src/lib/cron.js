const cron = require("node-cron");
const {Worker} = require('node:worker_threads');
const {cronOptions} = require("./makeConfig.js");
const {randomInt} = require("node:crypto");
const {
    orgEntries,
    entryIsLocked,
    entryHasSuccinctError,
    entryHasGeneratedContent,
    entryHas,
    entryHasOriginal
} = require("./dataLayers/fs");

function doSessionCron(app, frequency) {
    cron.schedule(
        cronOptions[frequency],
        () => {
            app.authSalts[0] = app.authSalts[1];
            app.authSalts[1] = shajs('sha256').update(randomInt(1000000, 9999999).toString()).digest('hex');
        }
    )
}

function doRenderCron(config) {
    cron.schedule(
        cronOptions[config.processFrequency],
        () => {
            let nLocked = 0;
            let taskSpecs = [];
            try {
                let orgs = config.orgs;
                for (const org of orgs) {
                    for (const entryRecord of orgEntries(config, org)) {
                        for (const revision of entryRecord.revisions) {
                            if (entryIsLocked(config, org, entryRecord.id, revision)) {
                                nLocked++;
                                continue;
                            }
                            if (
                                entryHasSuccinctError(config, org, entryRecord.id, revision) ||
                                entryHasGeneratedContent(config, org, entryRecord.id, revision)
                            ) {
                                continue;
                            }
                            if (entryHas(config, org, entryRecord.id, revision, "succinct.json")) {
                                taskSpecs.push([org, entryRecord.id, revision, 'succinct']);
                            } else if (entryHasOriginal(config, org, entryRecord.id, revision, "usfmBooks")) {
                                taskSpecs.push([org, entryRecord.id, revision, 'usfm']);
                            } else if (entryHasOriginal(config, org, entryRecord.id, revision, "usxBooks")) {
                                taskSpecs.push([org, entryRecord.id, revision, 'usx']);
                            } else if (entryHasOriginal(config, org, entryRecord.id, revision, "uwNotesBooks")) {
                                taskSpecs.push([org, entryRecord.id, revision, 'uwNotes']);
                            } else if (entryHasOriginal(config, org, entryRecord.id, revision, "studyNotes.tsv")) {
                                taskSpecs.push([org, entryRecord.id, revision, 'tyndaleStudyNotes']);
                            }
                        }
                    }
                }
            } catch (err) {
                const succinctError = {
                    generatedBy: 'cron',
                    context: {},
                    message: err.message
                };
                config.incidentLogger.error(succinctError);
                return;
            }
            try {
                for (
                    const taskSpec of taskSpecs
                    .map(value => ({value, sort: Math.random()}))
                    .sort((a, b) => a.sort - b.sort)
                    .map(({value}) => value)
                    .slice(0, Math.max(config.nWorkers - nLocked, 0))
                    ) {
                    if (config.verbose) {
                        config.incidentLogger.info({
                            context: {running: "cronTask"},
                            taskSpec
                        });
                    }
                    const worker = new Worker('./src/lib/makeDownloads.js');
                    worker.on('message', e => config.incidentLogger.info(e));
                    worker.on('error', e => config.incidentLogger.error(e));
                    const [org, transId, revision, contentType] = taskSpec;
                    worker.postMessage({configString: JSON.stringify({dataPath: config.dataPath}), org, transId, revision, contentType});
                }
            } catch (err) {
                console.log("makeDownload worker", err.message);
            }
        }
    );
}

module.exports = {doRenderCron, doSessionCron};
