const {Proskomma} = require('proskomma-core');
const fse = require('fs-extra')
const path = require("path");
const {parentPort} = require("node:worker_threads");
const XXH = require('xxhashjs');
const {PipelineHandler} = require('proskomma-json-tools');
const getSuccinct = require("./sbHandlerHelpers/makeSuccinct")

// const doPerfStripAlignmentTest = require("./test/test")

const pipelineH = new PipelineHandler({
    proskomma: new Proskomma(),
    verbose: false
});

const verbose = false;
const verifyDir = "./test/scribu-test-FR_LSG"

async function doPerfStripAlignment(bookName,perf) {

    let output;
    try {
      output = await pipelineH.runPipeline(
          'stripAlignmentPipeline', {
              perf
          }
      );
      const _alignment = {
          strippedAlignment: output.strippedAlignment,
          unalignedWords: output.unalignedWords
      }
      const perfOutput = JSON.stringify(output.perf);
      const alignmentOutput = JSON.stringify(_alignment);
      try {
        fse.writeFileSync(path.join(`${verifyDir}/perf/`, `${bookName}.json`), perfOutput);
        fse.writeFileSync(path.join(`${verifyDir}/alignment/`, `${bookName}.json`), alignmentOutput);
      } catch (err) {
          throw new Error(`Error from writeEntryResource: ${err.message}`);
      }
    } catch (err) {
        console.log(err);
    }
  };
  
function doScriptureHandling(metadata,idStr) {
    let pk;
    let docSetId;
    try {
        let stats = {
            nOT: 0,
            nNT: 0,
            nDC: 0,
            nChapters: 0,
            nVerses: 0,
            nIntroductions: 0,
            nHeadings: 0,
            nFootnotes: 0,
            nXrefs: 0,
            nStrong: 0,
            nLemma: 0,
            nGloss: 0,
            nContent: 0,
            nMorph: 0,
            nOccurrences: 0,
            documents: {}
        };
        try {
            pk = new Proskomma([
                {
                    name: "source",
                    type: "string",
                    regex: "^[^\\s]+$"
                },
                {
                    name: "project",
                    type: "string",
                    regex: "^[^\\s]+$"
                },
                // {
                //     name: "revision",
                //     type: "string",
                //     regex: "^[^\\s]+$"
                // },
                {
                    name: "bpkgVersion",
                    type: "string",
                    regex: "^[^\\s]+$"
                },
            ]);

            // const succinct = getSuccinct({pk, metadata, idStr, verbose})
            const rawSuccinct = fse.readFileSync(path.join(`${verifyDir}/`, "f848bc5.bpkg"));
            const succinct = JSON.parse(rawSuccinct.toString())
            pk.loadSuccinctDocSet(succinct);
            const docSetTags = pk.gqlQuerySync('{docSets { tagsKv {key value} } }').data.docSets[0].tagsKv;
            for (const kv of docSetTags) {
                if (["nOT", "nNT", "nDC"].includes(kv.key)) {
                    console.log(kv)
                    stats[kv.key] = kv.value;
                }
            }
    
            const docSet = pk.gqlQuerySync('{docSets { id documents { bookCode: header(id: "bookCode") sequences {type} } } }').data.docSets[0];
            docSetId = docSet.id;
        } catch (err) {
            const succinctError = {
                generatedBy: 'sbHandlerWorker',
                context: {
                    making: "populatePk",
                },
                message: err.message
            };
            parentPort.postMessage(succinctError);
            // writeSuccinctError(config, org, metadata.id, metadata.revision, succinctError);
            throw new Error(`Succinct could not be generated: ${err.message}`);
        }
        // Iterate over documents
        const documents = pk.gqlQuerySync(`{docSet(id: """${docSetId}""") {documents { id bookCode: header(id:"bookCode")} } }`).data.docSet.documents.map(d => ({
            id: d.id,
            book: d.bookCode
        }));
        for (const doc of documents) {
            try {
                const res = pk.gqlQuerySync(`{ document(id: """${doc.id}""") { bookCode: header(id:"bookCode") perf } }`)
                const curDoc = res?.data?.document
                console.log(curDoc.bookCode)
                const curPerf = JSON.parse(res?.data?.document?.perf)
                try {
                    doPerfStripAlignment(doc.book,curPerf)
                } catch (err) {
                    throw new Error(`Error from writeEntryBookResource: ${err.message}`);
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
            }
        }
        // The end!
        parentPort.postMessage({org, transId, revision, status: "done"});
    } catch (err) {
        const succinctError = {
            generatedBy: 'sbHandlerWorker',
            context: {
                // org,
                // transId,
                // revision,
                // contentType
            },
            message: err.message
        };
        parentPort.postMessage(succinctError);
    }
}

parentPort.on("message", data => {
    const result = fse.readJsonSync(data);
    const curHash = XXH.h32(JSON.stringify(result.identification), 0xEDCBA987).toString(16)
    doScriptureHandling(result,curHash)
    // doPerfStripAlignmentTest()
});
