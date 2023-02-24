CREATE TABLE IF NOT EXISTS PiazzaPost (
    uuid INTEGER PRIMARY KEY,
	postNumber INTEGER NOT NULL,
	clazz TEXT NOT NULL,
    title TEXT,
    rawText TEXT,
    cleanText TEXT,
    tags TEXT,
    created DATETIME,
    visibility TEXT,
    goodQuestion BOOLEAN
);