function makeAggregateStats(stats) {
    for (const bookStats of Object.values(stats.documents)) {
        for (const stat of [
            "nChapters",
            "nVerses",
            "nIntroductions",
            "nHeadings",
            "nFootnotes",
            "nXrefs",
            "nStrong",
            "nLemma",
            "nGloss",
            "nContent",
            "nMorph",
            "nOccurrences",
        ]) {
            stats[stat] += bookStats[stat];
        }
    }
}

module.exports = makeAggregateStats;
