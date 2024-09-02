const path = require("path");
const fse = require("fs-extra");

const translationDir = str => str.toLowerCase().replace(/[^A-Za-z0-9_-]/g, '');

const orgPath =
    (dataPath, translationDir) => {
        return path.resolve(
            dataPath,
            translationDir,
        );
    }

const transPath =
    (dataPath, translationDir, translationId, translationRevision, extra) => {
        if (!translationRevision || extra) {
            throw new Error("transPath requires 4 args");
        }
        return path.resolve(
            dataPath,
            translationDir,
            translationId,
            translationRevision
        );
    }

const transParentPath =
    (dataPath, translationDir, translationId, extra) => {
        if (!translationId || extra) {
            throw new Error("transParentPath requires 3 args");
        }
        return path.resolve(
            dataPath,
            translationDir,
            translationId
        );
    }

const usfmDir =
    (dataPath, translationDir, translationId, translationRevision, extra) => {
        if (!translationRevision || extra) {
            throw new Error("usfmDir requires 4 args");
        }
        return path.join(
            transPath(dataPath, translationDir, translationId, translationRevision),
            'original',
            'usfmBooks'
        );
    }

const usxDir =
    (dataPath, translationDir, translationId, translationRevision, extra) => {
        if (!translationRevision || extra) {
            throw new Error("usxDir requires 4 args");
        }
        return path.join(
            transPath(dataPath, translationDir, translationId, translationRevision),
            'original',
            'usxBooks'
        );
    }

const perfDir =
    (dataPath, translationDir, translationId, translationRevision, extra) => {
        if (!translationRevision || extra) {
            throw new Error("perfDir requires 4 args");
        }
        return path.join(
            transPath(dataPath, translationDir, translationId, translationRevision),
            'generated',
            'perfBooks'
        );
    }

const simplePerfDir =
    (dataPath, translationDir, translationId, translationRevision, extra) => {
        if (!translationRevision || extra) {
            throw new Error("simplePerfDir requires 4 args");
        }
        return path.join(
            transPath(dataPath, translationDir, translationId, translationRevision),
            'generated',
            'simplePerfBooks'
        );
    }

const sofriaDir =
    (dataPath, translationDir, translationId, translationRevision, extra) => {
        if (!translationRevision || extra) {
            throw new Error("sofriaDir requires 4 args");
        }
        return path.join(
            transPath(dataPath, translationDir, translationId, translationRevision),
            'generated',
            'sofriaBooks'
        );
    }

const succinctPath =
    (dataPath, translationDir, translationId, translationRevision, extra) => {
        if (!translationRevision || extra) {
            throw new Error("succinctPath requires 4 args");
        }
        const tp = transPath(dataPath, translationDir, translationId, translationRevision);
        const originalPath = path.join(
            tp,
            'original',
            'succinct.json'
        );
        const generatedPath = path.join(
            tp,
            'generated',
            'succinct.json'
        );
        if (fse.pathExistsSync(originalPath)) {
            return originalPath;
        } else {
            return generatedPath;
        }
    }

const succinctErrorPath =
    (dataPath, translationDir, translationId, translationRevision, extra) => {
        if (!translationRevision || extra) {
            throw new Error("succinctErrorPath requires 4 args");
        }
        return path.join(
            transPath(dataPath, translationDir, translationId, translationRevision),
            'succinctError.json'
        );
    }

const lockPath =
    (dataPath, translationDir, translationId, translationRevision, extra) => {
        if (!translationRevision || extra) {
            throw new Error("lockPath requires 4 args");
        }
        return path.join(
            transPath(dataPath, translationDir, translationId, translationRevision),
            'lock.json'
        );
    }

const vrsPath =
    (dataPath, translationDir, translationId, translationRevision, extra) => {
        if (!translationRevision || extra) {
            throw new Error("vrsPath requires 4 args");
        }
        return path.join(
            transPath(dataPath, translationDir, translationId, translationRevision),
            'original',
            'versification.vrs'
        );
    }

const originalResourcePath =
    (dataPath, translationDir, translationId, translationRevision, extra) => {
        if (!translationRevision || extra) {
            throw new Error("originalResourcePath requires 4 args");
        }
        return path.join(
            transPath(dataPath, translationDir, translationId, translationRevision),
            'original',
        );
    }

const generatedResourcePath =
    (dataPath, translationDir, translationId, translationRevision, extra) => {
        if (!translationRevision || extra) {
            throw new Error("generatedResourcePath requires 4 args");
        }
        return path.join(
            transPath(dataPath, translationDir, translationId, translationRevision),
            'generated',
        );
    }

const uiConfigDir = (dataPath) => {
    const pathParts = [dataPath, 'ui-config.json'];
    return path.join(...pathParts);
}

module.exports = {
    orgPath,
    transPath,
    transParentPath,
    usfmDir,
    usxDir,
    perfDir,
    simplePerfDir,
    sofriaDir,
    succinctPath,
    succinctErrorPath,
    lockPath,
    vrsPath,
    originalResourcePath,
    generatedResourcePath,
    translationDir,
    uiConfigDir
};
