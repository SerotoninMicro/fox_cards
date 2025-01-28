const languageConfig = {
    languages: {
        "French": {
            sourceProperty: "french",  // Add missing properties
            targetProperty: "english",
            levels: [
                {
                    id: "A1",
                    name: "A1 (Basic)",
                    dataFile: "data/a1LevelFrench.json"  // Keep path relative to index.html
                }
            ]
        }
    }
};