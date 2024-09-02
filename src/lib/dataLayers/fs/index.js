const fse = require('fs-extra');
const {
    orgPath,
    transPath,
    transParentPath,
    translationDir,
    uiConfigDir
} = require("./dataPaths.js");
const path = require("path");

// Utils

const checkResourceOrigin = v => {
    if (!["original", "generated"].includes(v)) {
        throw new Error(`Resource origin should be 'original' or 'generated', not '${v}'`);
    }
}

// Orgs

const orgExists = (config, orgName) => {
    try {
        if (!(typeof orgName === "string")) {
            throw new Error('orgName should be string');
        }
        const orgP = orgPath(config.dataPath, translationDir(orgName));
        return fse.pathExistsSync(orgP)
    } catch (err) {
        throw new Error(`Error from orgExists: ${err.message}`);
    }
}

const initializeOrg = (config, orgName) => {
    try {
    if (!(typeof orgName === "string")) {
        throw new Error('orgName should be string');
    }
    const orgP = orgPath(config.dataPath, translationDir(orgName));
    if (!fse.pathExistsSync(orgP)) {
        fse.mkdirsSync(orgP);
    }
    } catch (err) {
        throw new Error(`Error from initializeOrg: ${err.message}`);
    }
}

// Entries

const initializeEmptyEntry = (config, orgName, transId, transRevision) => {
    try {
    if (!(typeof orgName === "string")) {
        throw new Error('orgName should be string');
    }
    const tp = transPath(
        config.dataPath,
        translationDir(orgName),
        transId,
        transRevision.replace(/\s/g, "__")
    );
    if (fse.pathExistsSync(tp)) {
        throw new Error(`Entry ${orgName}/${transId}/${transRevision} already exists`);
    }
    fse.mkdirsSync(tp);
    const originalDir = path.join(tp, "original");
    if (!fse.pathExistsSync(originalDir)) {
        fse.mkdirsSync(originalDir);
    }
    } catch (err) {
        throw new Error(`Error from initializeEmptyEntry: ${err.message}`);
    }
}

const orgEntries = (config, orgName) => {
    try {
    if (!(typeof orgName === "string")) {
        throw new Error('orgName should be string');
    }
    const orgP = orgPath(
        config.dataPath,
        translationDir(orgName)
    );
    return fse.readdirSync(
        orgP
    )
        .map(e => ({
            id: e,
            revisions: fse.readdirSync(path.join(orgP, e))
        }))
    } catch (err) {
        throw new Error(`Error from orgEntries: ${err.message}`);
    }
}

const deleteEntry = (config, orgName, transId, transRevision) => {
    try {
    if (!(typeof orgName === "string")) {
        throw new Error('orgName should be string');
    }
    const tp = transPath(
        config.dataPath,
        translationDir(orgName),
        transId,
        transRevision.replace(/\s/g, "__")
    );
    fse.remove(tp);
    } catch (err) {
        throw new Error(`Error from deleteEntry: ${err.message}`);
    }
}

const deleteGeneratedEntryContent = (config, orgName, transId, transRevision) => {
    try {
    if (!(typeof orgName === "string")) {
        throw new Error('orgName should be string');
    }
    const tp = transPath(
        config.dataPath,
        translationDir(orgName),
        transId,
        transRevision.replace(/\s/g, "__")
    );
    fse.remove(path.join(tp, "generated"));
    } catch (err) {
        throw new Error(`Error from deleteGeneratedEntryContent: ${err.message}`);
    }
}

const _entryResources = (config, orgName, transId, transRevision, resourceOrigin) => {
    try {
    const tp = transPath(
        config.dataPath,
        translationDir(orgName),
        transId,
        transRevision.replace(/\s/g, "__")
    );
    checkResourceOrigin(resourceOrigin);
    const resourceDirPath = path.join(tp, resourceOrigin);
    if (fse.pathExistsSync(resourceDirPath)) {
        return fse.readdirSync(resourceDirPath)
            .filter(p => !fse.lstatSync(path.join(tp, resourceOrigin, p)).isDirectory())
            .map(p => ({
                type: p.split('.')[0],
                isOriginal: (resourceOrigin === "original"),
                content: readEntryResource(config, orgName, transId, transRevision, p),
                suffix: p.split('.')[1]
            }));
    } else {
        return [];
    }
    } catch (err) {
        throw new Error(`Error from _entryResources: ${err.message}`);
    }
}

const originalEntryResources = (config, orgName, transId, transRevision) => {
    return _entryResources(config, orgName, transId, transRevision, "original");
}

const generatedEntryResources = (config, orgName, transId, transRevision) => {
    return _entryResources(config, orgName, transId, transRevision, "generated");
}

const entryResources = (config, orgName, transId, transRevision) => {
    return [
        ...originalEntryResources(config, orgName, transId, transRevision),
        ...generatedEntryResources(config, orgName, transId, transRevision)
    ];
}

const initializeEntryBookResourceCategory = (config, orgName, transId, transRevision, resourceOrigin, resourceCategory) => {
    try {
    if (!(typeof orgName === "string")) {
        throw new Error('orgName should be string');
    }
    checkResourceOrigin(resourceOrigin);
    const tp = transPath(
        config.dataPath,
        translationDir(orgName),
        transId,
        transRevision.replace(/\s/g, "__")
    );
    const booksPath = path.join(tp, resourceOrigin, resourceCategory);
    if (!fse.pathExistsSync(booksPath)) {
        fse.mkdirsSync(booksPath);
    }
    } catch (err) {
        throw new Error(`Error from initializeEntryBookResourceCategory: ${err.message}`);
    }
}

const entryBookResourcesForCategory = (config, orgName, transId, transRevision, bookResourceCategory) => {
    try {
    if (!(typeof orgName === "string")) {
        throw new Error('orgName should be string');
    }
    const tp = transPath(
        config.dataPath,
        translationDir(orgName),
        transId,
        transRevision.replace(/\s/g, "__")
    );
    let resourceOrigin;
    if (fse.pathExistsSync(path.join(tp, "original", bookResourceCategory))) {
        resourceOrigin = "original";
    }
    if (fse.pathExistsSync(path.join(tp, "generated", bookResourceCategory))) {
        resourceOrigin = "generated";
    }
    if (!resourceOrigin) {
        throw new Error(`Resource category ${bookResourceCategory} not found for ${orgName}/${transId}/${transRevision}`);
    }
    return fse.readdirSync(path.join(tp, resourceOrigin, bookResourceCategory));
    } catch (err) {
        throw new Error(`Error from entryBookResourcesFromCategory: ${err.message}`);
    }
}

const _entryBookResourcesForBook = (config, orgName, transId, transRevision, resourceOrigin, bookCode) => {
    try {
    checkResourceOrigin(resourceOrigin);
    const tp = transPath(
        config.dataPath,
        translationDir(orgName),
        transId,
        transRevision.replace(/\s/g, "__")
    );
    const resourceDirPath = path.join(tp, resourceOrigin);
    if (fse.pathExistsSync(resourceDirPath)) {
        const ret = [];
        for (const bookResourceDir of fse.readdirSync(resourceDirPath)
            .filter(p => fse.lstatSync(path.join(resourceDirPath, p)).isDirectory())) {
            for (const resource of fse.readdirSync(path.join(resourceDirPath, bookResourceDir))
                .filter(r => r.startsWith(`${bookCode}.`))) {
                ret.push({
                    type: bookResourceDir,
                    isOriginal: (resourceOrigin === "original"),
                    content: readEntryBookResource(config, orgName, transId, transRevision, bookResourceDir, resource),
                    suffix: resource.split('.')[1]
                })
            }
        }
        return ret;
    } else {
        return [];
    }
    } catch (err) {
        throw new Error(`Error from _entryBookResourcesForBook: ${err.message}`);
    }
}

const originalEntryBookResourcesForBook = (config, orgName, transId, transRevision, bookCode) => {
    return _entryBookResourcesForBook(config, orgName, transId, transRevision, "original", bookCode);
}

const generatedEntryBookResourcesForBook = (config, orgName, transId, transRevision, bookCode) => {
    return _entryBookResourcesForBook(config, orgName, transId, transRevision, "generated", bookCode);
}

const entryBookResourcesForBook = (config, orgName, transId, transRevision, bookCode) => {
    return [
        ...originalEntryBookResourcesForBook(config, orgName, transId, transRevision, bookCode),
        ...generatedEntryBookResourcesForBook(config, orgName, transId, transRevision, bookCode)
    ];
}

const _entryBookResourceBookCodes = (config, orgName, transId, transRevision, resourceOrigin) => {
    try {
    checkResourceOrigin(resourceOrigin);
    const tp = transPath(
        config.dataPath,
        translationDir(orgName),
        transId,
        transRevision.replace(/\s/g, "__")
    );
    const resourceDirPath = path.join(tp, resourceOrigin);
    const bookCodes = new Set([]);
    if (fse.pathExistsSync(resourceDirPath)) {
        for (const bookResourceDir of fse.readdirSync(resourceDirPath)
            .filter(p => fse.lstatSync(path.join(tp, resourceOrigin, p)).isDirectory())) {
            for (const resource of fse.readdirSync(path.join(resourceDirPath, bookResourceDir))) {
                bookCodes.add(resource.split('.')[0]);
            }
        }
        return Array.from(bookCodes);
    } else {
        return [];
    }
    } catch (err) {
        throw new Error(`Error from _entryBookResourceBookCodes: ${err.message}`);
    }

}

const originalEntryBookResourceBookCodes = (config, orgName, transId, transRevision) => {
    return _entryBookResourceBookCodes(config, orgName, transId, transRevision, "original");
}

const generatedEntryBookResourceBookCodes = (config, orgName, transId, transRevision) => {
    return _entryBookResourceBookCodes(config, orgName, transId, transRevision, "generated");
}

const entryBookResourceBookCodes = (config, orgName, transId, transRevision) => {
    return Array.from(
        new Set([
                ...originalEntryBookResourceBookCodes(config, orgName, transId, transRevision),
                ...generatedEntryBookResourceBookCodes(config, orgName, transId, transRevision)
            ]
        )
    );
}

const _entryBookResourceBookCodesForCategory = (config, orgName, transId, transRevision, resourceOrigin, category) => {
    try {
    checkResourceOrigin(resourceOrigin);
    const tp = transPath(
        config.dataPath,
        translationDir(orgName),
        transId,
        transRevision.replace(/\s/g, "__")
    );
    const resourceDirPath = path.join(tp, resourceOrigin, `${category}Books`);
    const bookCodes = new Set([]);
    if (fse.pathExistsSync(resourceDirPath) && fse.lstatSync(resourceDirPath).isDirectory()) {
        for (const resource of fse.readdirSync(resourceDirPath)) {
            bookCodes.add(resource.split('.')[0]);
        }
        return Array.from(bookCodes);
    } else {
        return [];
    }
    } catch (err) {
        throw new Error(`Error from _entryBookResourceBookCodesForCategory: ${err.message}`);
    }
}

const originalEntryBookResourceBookCodesForCategory = (config, orgName, transId, transRevision, category) => {
    return _entryBookResourceBookCodesForCategory(config, orgName, transId, transRevision, "original", category);
}

const generatedEntryBookResourceBookCodesForCategory = (config, orgName, transId, transRevision, category) => {
    return _entryBookResourceBookCodesForCategory(config, orgName, transId, transRevision, "generated", category);
}

const entryBookResourceBookCodesForCategory = (config, orgName, transId, transRevision, category) => {
    return Array.from(
        new Set([
                ...originalEntryBookResourceBookCodesForCategory(config, orgName, transId, transRevision, category),
                ...generatedEntryBookResourceBookCodesForCategory(config, orgName, transId, transRevision, category)
            ]
        )
    );
}

const _entryBookResourceCategories = (config, orgName, transId, transRevision, resourceOrigin) => {
    try {
    checkResourceOrigin(resourceOrigin);
    const tp = transPath(
        config.dataPath,
        translationDir(orgName),
        transId,
        transRevision.replace(/\s/g, "__")
    );
    const resourcesDirPath = path.join(tp, resourceOrigin);
    if (fse.pathExistsSync(resourcesDirPath)) {
        return fse.readdirSync(resourcesDirPath)
            .filter(c => fse.lstatSync(path.join(resourcesDirPath, c)).isDirectory());
    } else {
        return [];
    }
    } catch (err) {
        throw new Error(`Error from _entryBookResourceCategories: ${err.message}`);
    }
}

const originalEntryBookResourceCategories = (config, orgName, transId, transRevision) => {
    return _entryBookResourceCategories(config, orgName, transId, transRevision, "original");
}

const generatedEntryBookResourceCategories = (config, orgName, transId, transRevision) => {
    return _entryBookResourceCategories(config, orgName, transId, transRevision, "generated");
}

const entryBookResourceCategories = (config, orgName, transId, transRevision) => {
    return Array.from(
        new Set([
                ...originalEntryBookResourceCategories(config, orgName, transId, transRevision),
                ...generatedEntryBookResourceCategories(config, orgName, transId, transRevision)
            ]
        )
    );
}


// Entry Tests

const entryExists = (config, orgName, transId, transRevision) => {
    try {
    const tp = transParentPath(
        config.dataPath,
        translationDir(orgName),
        transId,
        transRevision);
    return fse.pathExistsSync(tp);
    } catch (err) {
        throw new Error(`Error from entryExists: ${err.message}`);
    }
}

const entryRevisionExists = (config, orgName, transId) => {
    try {
    const tpp = transParentPath(
        config.dataPath,
        translationDir(orgName),
        transId);
    return fse.pathExistsSync(tpp);
    } catch (err) {
        throw new Error(`Error from entryRevisionExists: ${err.message}`);
    }
}

const entryIsLocked = (config, orgName, transId, transRevision) => {
    try {
    const tp = transPath(
        config.dataPath,
        translationDir(orgName),
        transId,
        transRevision.replace(/\s/g, "__")
    );
    return fse.pathExistsSync(path.join(tp, "lock.json"));
    } catch (err) {
        throw new Error(`Error from entryIsLocked: ${err.message}`);
    }
};

const entryHasSuccinctError = (config, orgName, transId, transRevision) => {
    try {
    const tp = transPath(
        config.dataPath,
        translationDir(orgName),
        transId,
        transRevision.replace(/\s/g, "__")
    );
    return fse.pathExistsSync(path.join(tp, "succinctError.json"));
    } catch (err) {
        throw new Error(`Error from entryHasSuccinctError: ${err.message}`);
    }
};

const entryHasGeneratedContent = (config, orgName, transId, transRevision) => {
    try {
    const tp = transPath(
        config.dataPath,
        translationDir(orgName),
        transId,
        transRevision.replace(/\s/g, "__")
    );
    return fse.pathExistsSync(path.join(tp, "generated"));
    } catch (err) {
        throw new Error(`Error from entryHasGeneratedContent: ${err.message}`);
    }
};

const entryHasOriginal = (config, orgName, transId, transRevision, contentType) => {
    try {
    const tp = transPath(
        config.dataPath,
        translationDir(orgName),
        transId,
        transRevision.replace(/\s/g, "__")
    );
    return fse.pathExistsSync(path.join(tp, "original", contentType));
    } catch (err) {
        throw new Error(`Error from entryHasOriginal: ${err.message}`);
    }
};

const entryHasGenerated = (config, orgName, transId, transRevision, contentType) => {
    try {
    const tp = transPath(
        config.dataPath,
        translationDir(orgName),
        transId,
        transRevision.replace(/\s/g, "__")
    );
    return fse.pathExistsSync(path.join(tp, "generated", contentType));
    } catch (err) {
        throw new Error(`Error from entryHasGenerated: ${err.message}`);
    }
};

const entryHas = (config, orgName, transId, transRevision, contentType) => {
    try {
        return entryHasOriginal(config, orgName, transId, transRevision, contentType) ||
            entryHasGenerated(config, orgName, transId, transRevision, contentType);
    } catch (err) {
        throw new Error(`Error from entryHas: ${err.message}`);
    }
};

const entryHasOriginalBookResourceCategory = (config, orgName, transId, transRevision, contentType) => {
    try {
    const tp = transPath(
        config.dataPath,
        translationDir(orgName),
        transId,
        transRevision.replace(/\s/g, "__")
    );
    const rcPath = path.join(tp, "original", contentType);
    return fse.pathExistsSync(rcPath) && fse.lstatSync(rcPath).isDirectory();
    } catch (err) {
        throw new Error(`Error from entryHasOriginalBookResourceCategory: ${err.message}`);
    }
};

const entryHasGeneratedBookResourceCategory = (config, orgName, transId, transRevision, contentType) => {
    try {
    const tp = transPath(
        config.dataPath,
        translationDir(orgName),
        transId,
        transRevision.replace(/\s/g, "__")
    );
    const rcPath = path.join(tp, "generated", contentType);
    return fse.pathExistsSync(rcPath) && fse.lstatSync(rcPath).isDirectory();
    } catch (err) {
        throw new Error(`Error from entryHasGeneratedBookResourceCategory: ${err.message}`);
    }
};

const entryHasBookSourceCategory = (config, orgName, transId, transRevision, contentType) => {
    try {
    return entryHasOriginalBookResourceCategory(config, orgName, transId, transRevision, contentType) ||
        entryHasGeneratedBookResourceCategory(config, orgName, transId, transRevision, contentType);
    } catch (err) {
        throw new Error(`Error from entryHasBookSourceCategory: ${err.message}`);
    }
};

// Lock/Unlock

const lockEntry = (config, orgName, transId, transRevision, lockMsg) => {
    try {
    if (!(typeof orgName === "string")) {
        throw new Error('orgName should be string');
    }
    const tp = transPath(
        config.dataPath,
        translationDir(orgName),
        transId,
        transRevision.replace(/\s/g, "__")
    );
    fse.writeJsonSync(path.join(tp, "lock.json"), {
        actor: lockMsg,
        orgDir: translationDir(orgName),
        transId: transId,
        revision: transRevision
    });
    } catch (err) {
        throw new Error(`Error from lockEntry: ${err.message}`);
    }
}

const unlockEntry = (config, orgName, transId, transRevision) => {
    try {
    if (!(typeof orgName === "string")) {
        throw new Error('orgName should be string');
    }
    const tp = transPath(
        config.dataPath,
        translationDir(orgName),
        transId,
        transRevision.replace(/\s/g, "__")
    );
    fse.remove(path.join(tp, "lock.json"));
    } catch (err) {
        throw new Error(`Error from unlockEntry: ${err.message}`);
    }
}

// Succinct error

const writeSuccinctError = (config, orgName, transId, transRevision, succinctErrorJson) => {
    // Expect and write JSON
    try {
    const tp = transPath(
        config.dataPath,
        translationDir(orgName),
        transId,
        transRevision.replace(/\s/g, "__")
    );
    fse.writeJsonSync(path.join(tp, "succinctError.json"), succinctErrorJson);
    } catch (err) {
        throw new Error(`Error from writeSuccinctError: ${err.message}`);
    }
};

const deleteSuccinctError = (config, orgName, transId, transRevision) => {
    try {
    const tp = transPath(
        config.dataPath,
        translationDir(orgName),
        transId,
        transRevision.replace(/\s/g, "__")
    );
    fse.remove(path.join(tp, "succinctError.json"));
    } catch (err) {
        throw new Error(`Error from deleteSuccinctError: ${err.message}`);
    }
};

// Read

const readEntryMetadata = (config, orgName, transId, transRevision) => {
    // Returns JSON
    try {
    if (!(typeof orgName === "string")) {
        throw new Error('orgName should be string');
    }
    const tp = transPath(
        config.dataPath,
        translationDir(orgName),
        transId,
        transRevision.replace(/\s/g, "__")
    );
    return fse.readJsonSync(path.join(tp, "metadata.json"));
    } catch (err) {
        throw new Error(`Error from readEntryMetadata: ${err.message}`);
    }
}

const readEntryResource = (config, orgName, transId, transRevision, resourceName) => {
    // Returns JSON or a string depending on resourceName suffix
    try {
    if (!(typeof orgName === "string")) {
        throw new Error('orgName should be string');
    }
    const tp = transPath(
        config.dataPath,
        translationDir(orgName),
        transId,
        transRevision.replace(/\s/g, "__")
    );
    let rawRead;
    if (fse.pathExistsSync(path.join(tp, "original", resourceName))) {
        rawRead = fse.readFileSync(path.join(tp, "original", resourceName));
    }
    if (fse.pathExistsSync(path.join(tp, "generated", resourceName))) {
        rawRead = fse.readFileSync(path.join(tp, "generated", resourceName));
    }
    if (!rawRead) {
        return null;
    }
    if (resourceName.endsWith('.json')) {
        return JSON.parse(rawRead.toString());
    } else {
        return rawRead.toString();
    }
    } catch (err) {
        throw new Error(`Error from readEntryResource: ${err.message}`);
    }
}

const readEntryBookResource = (config, orgName, transId, transRevision, resourceCategory, resourceName) => {
    // Returns JSON or a string depending on resourceName suffix
    try {
    if (!(typeof orgName === "string")) {
        throw new Error('orgName should be string');
    }
    const tp = transPath(
        config.dataPath,
        translationDir(orgName),
        transId,
        transRevision.replace(/\s/g, "__")
    );
    let resourceOrigin;
    if (fse.pathExistsSync(path.join(tp, "original", resourceCategory))) {
        resourceOrigin = "original";
    } else if (fse.pathExistsSync(path.join(tp, "generated", resourceCategory))) {
        resourceOrigin = "generated";
    } else {
        throw new Error(`No book resource category '${resourceCategory}' for ${transId}/${transRevision}`);
    }
    if (!fse.pathExistsSync(tp, resourceOrigin, resourceCategory, resourceName)) {
        throw new Error(`Book resource ${resourceCategory}/${resourceName} not found for ${orgName}/${transId}/${transRevision}`);
    }
    const rawRead = fse.readFileSync(path.join(tp, resourceOrigin, resourceCategory, resourceName));
    if (resourceName.endsWith('.json')) {
        return JSON.parse(rawRead.toString());
    } else {
        return rawRead.toString();
    }
    } catch (err) {
        throw new Error(`Error from readEntryBookResource: ${err.message}`);
    }
}

const readFlexibleUIConfig = (config) => {
    try {
        return fse.readJsonSync(uiConfigDir(config.uiConfigPath));
    } catch (err) {
        return null;
    }
}

// Write

const writeEntryBookResource = (config, orgName, transId, transRevision, resourceCategory, resourceName, rawContent) => {
    // Convert JSON to string before writing according to resourceName suffix
    try {
    if (!(typeof orgName === "string")) {
        throw new Error('orgName should be string');
    }
    const tp = transPath(
        config.dataPath,
        translationDir(orgName),
        transId,
        transRevision.replace(/\s/g, "__")
    );
    let resourceOrigin;
    if (fse.pathExistsSync(path.join(tp, "original", resourceCategory))) {
        resourceOrigin = "original";
    } else if (fse.pathExistsSync(path.join(tp, "generated", resourceCategory))) {
        resourceOrigin = "generated";
    } else {
        throw new Error(`No book resource category '${resourceCategory}' for ${transId}/${transRevision}`);
    }
    const content = resourceName.endsWith('.json') ? JSON.stringify(rawContent) : rawContent;
    fse.writeFileSync(path.join(tp, resourceOrigin, resourceCategory, resourceName), content);
    } catch (err) {
        throw new Error(`Error from writeEntryBookResource: ${err.message}`);
    }
}

const writeEntryMetadata = (config, orgName, transId, transRevision, contentJson) => {
    // Expect and write JSON
    try {
    if (!(typeof orgName === "string")) {
        throw new Error('orgName should be string in writeEntryMetadataJson');
    }
    const tp = transPath(
        config.dataPath,
        translationDir(orgName),
        transId,
        transRevision.replace(/\s/g, "__")
    );
    fse.writeJsonSync(path.join(tp, "metadata.json"), contentJson);
    } catch (err) {
        throw new Error(`Error from writeEntryMetadata: ${err.message}`);
    }
}

const writeEntryResource = (config, orgName, transId, transRevision, resourceOrigin, resourceName, rawContent) => {
    // Convert JSON to string before writing according to resourceName suffix
    try {
    checkResourceOrigin(resourceOrigin);
    if (!(typeof orgName === "string")) {
        throw new Error('orgName should be string in writeEntryResource');
    }
    const tp = transPath(
        config.dataPath,
        translationDir(orgName),
        transId,
        transRevision.replace(/\s/g, "__")
    );
    const originPath = path.resolve(tp, resourceOrigin);
    if (!fse.pathExistsSync(originPath)) {
        fse.mkdirsSync(originPath);
    }
    const content = resourceName.endsWith('.json') ? JSON.stringify(rawContent) : rawContent;
    fse.writeFileSync(path.join(originPath, resourceName), content);
    } catch (err) {
        throw new Error(`Error from writeEntryResource: ${err.message}`);
    }
}

const writeFlexibleUIConfig = (config, objData) => {
    try {
        fse.writeFileSync(uiConfigDir(config.uiConfigPath), JSON.stringify(objData));
    } catch (err) {
        throw new Error(`Error from writeFlexibleUIConfig: ${err.message}`);
    }
}


const _createDirIfNotExist = (strDirPath) => {
    if (!fse.existsSync(strDirPath)) {
        fse.mkdirSync(strDirPath)
    }
}
const _removeDirIfExist = (strDirPath) => {
    return fse.rm(strDirPath, { maxRetries: 5, recursive: true, force: true })
}
const _updateStaticStructureJson = (structurePath, manipulatorFun) => {
    const structureJsonPath = path.join(structurePath, 'structure.json');
    const jsonStructure = JSON.parse(fse.readFileSync(structureJsonPath, 'utf8') ?? '');
    let result = jsonStructure;
    if (jsonStructure?.urls && Array.isArray(jsonStructure.urls)) {
        if (manipulatorFun) {
            result = manipulatorFun(jsonStructure);
            fse.writeFileSync(structureJsonPath, JSON.stringify(result, null, 2));
        }
    }
    return result;
}
const writeStaticPageConfig = (config, pageInfo) => {
    try {
        const { lang, body, menuText, url } = pageInfo;
        if (!lang || !url) throw new Error('`lang` and `url` field should not be empty!');
        const pageDirPath = path.join(config.structurePath, 'pages', url);
        const langDirPath = path.join(config.structurePath, 'pages', url, lang);

        _createDirIfNotExist(pageDirPath);
        _createDirIfNotExist(langDirPath);

        if (!['list'].includes(url)) fse.writeFileSync(`${langDirPath}/body.md`, body);
        fse.writeFileSync(`${langDirPath}/menu.txt`, menuText);

        if (!['home', 'list'].includes(url)) {
            _updateStaticStructureJson(config.structurePath, (structure) => {
                if (!structure.urls.find(u => u === url)) {
                    structure.urls.push(url)
                }
                return structure
            })
        }
        return
    } catch (err) {
        throw new Error(`Error from writeStaticPageConfig: ${err.message}`);
    }
}
const removeStaticPage = async (config, pageInfo) => {
    try {
        const { url } = pageInfo;
        if (!url) throw new Error('url should not be empty!');
        const pageDirPath = path.join(config.structurePath, 'pages', url);
        if (!['home', 'list'].includes(url)) {            
            await _removeDirIfExist(pageDirPath);
            _updateStaticStructureJson(config.structurePath, (structure) => {
                const urlIdx = structure.urls.findIndex(u => u === url);
                if (urlIdx > -1) {
                    structure.urls.splice(urlIdx, 1);
                }
                return structure;
            })
        }
        return true
    } catch (err) {
        throw new Error(`Error from removeStaticPage: ${err.message}`);
    }
}

module.exports = {
    initializeOrg,
    orgExists,
    orgEntries,
    initializeEmptyEntry,
    deleteEntry,
    deleteGeneratedEntryContent,
    initializeEntryBookResourceCategory,
    entryBookResourcesForCategory,
    lockEntry,
    unlockEntry,
    readEntryMetadata,
    writeEntryMetadata,
    readEntryResource,
    writeEntryResource,
    readEntryBookResource,
    writeEntryBookResource,
    entryIsLocked,
    entryHasSuccinctError,
    entryHasGeneratedContent,
    entryHas,
    entryHasOriginal,
    entryHasGenerated,
    writeSuccinctError,
    deleteSuccinctError,
    entryExists,
    entryRevisionExists,
    entryHasBookSourceCategory,
    entryHasOriginalBookResourceCategory,
    entryHasGeneratedBookResourceCategory,
    originalEntryResources,
    generatedEntryResources,
    entryResources,
    originalEntryBookResourcesForBook,
    generatedEntryBookResourcesForBook,
    entryBookResourcesForBook,
    originalEntryBookResourceBookCodes,
    generatedEntryBookResourceBookCodes,
    entryBookResourceBookCodes,
    originalEntryBookResourceBookCodesForCategory,
    generatedEntryBookResourceBookCodesForCategory,
    entryBookResourceBookCodesForCategory,
    originalEntryBookResourceCategories,
    generatedEntryBookResourceCategories,
    entryBookResourceCategories,
    writeFlexibleUIConfig,
    readFlexibleUIConfig,
    writeStaticPageConfig,
    removeStaticPage
}
