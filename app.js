import fetch from 'node-fetch'
import fs from 'fs'
import sqlite3 from 'sqlite3';


const MODE = process.argv[2];

const COOKIE = fs.readFileSync('cookie.secret').toString().trim()
const CSRF = fs.readFileSync('csrf.secret').toString().trim()
const PIAZZA_DATA = JSON.parse(fs.readFileSync('piazza.secret').toString().trim())
const INIT_SQL = fs.readFileSync("init.sql").toString().trim();
const FS_DB = "db.db";


const INSERT_PIAZZA_POST = "INSERT INTO PiazzaPost(postNumber, clazz, title, rawText, cleanText, tags, created, visibility, goodQuestion) VALUES(?, ?, ?, ?, ?, ?, ?, ?, ?)"

async function fetchPiazzaPost(cid, nid) {
    cid = '' + cid;
    const resp = await fetch("https://piazza.com/logic/api?method=content.get", {
        "headers": {
            "content-type": "application/json",
            "csrf-token": CSRF,
            "cookie": COOKIE,
        },
        "body": JSON.stringify({
            method: "content.get",
            params: {
                cid: cid,
                nid: nid,
                student_view: null
            }
        }),
        "method": "POST"
    })
    if (Math.trunc(resp.status / 100) !== 2) {
        console.error(`Recieved non-200 response (${resp.status}) from @${cid} on ${nid}`)
    }
    try {
        const data = await resp.json();
        if (data.error === 'The post you are looking for cannot be found') {
            console.log(`@${cid} DNE on ${nid}`);
            return undefined;
        }
        return data;
    } catch (e) {
        console.error(`Encountered error processing @${cid} on ${nid}`)
        console.error(e);
        return undefined;
    }
}

async function fetchPiazzaData(clazz_name, clazz) {
    let data = [];
    for (let pid = clazz.start_pid; pid <= clazz.end_pid; pid++) {
        console.log(`Fetching @${pid} on ${clazz.nid}`)
        const datum = await fetchPiazzaPost(pid, clazz.nid);
        data.push(datum);

        // random timing -- throw off the security guards!
        await wait(1000 + (Math.random() * 2000));
    }
    fs.writeFileSync(`output/${clazz_name}.json`, JSON.stringify(data, null, 2))
}

// https://stackoverflow.com/questions/6921895/synchronous-delay-in-code-execution
function wait(ms) {
    return new Promise((resolve, reject) => {
        setTimeout(() => {
            resolve(ms)
        }, ms)
    })
}

// https://stackoverflow.com/questions/7394748/whats-the-right-way-to-decode-a-string-that-has-special-html-entities-in-it
function decodeHtmlEntity(str) {
    return str?.replace(/&#(\d+);/g, function (match, dec) {
        return String.fromCharCode(dec);
    });
};

async function modeScrape() {
    if (!fs.existsSync('output')) {
        console.log('Creating output directory.')
        fs.mkdirSync('output');
    }

    console.log("Beginning scraping...")
    for (let k in PIAZZA_DATA) {
        console.log(`Beginning scraping for ${k}...`)
        await fetchPiazzaData(k, PIAZZA_DATA[k])
        console.log(`Done scraping for ${k}!`)
    }
    console.log("Done scraping!");
}

async function modeStore() {
    const db = await new sqlite3.Database(FS_DB, sqlite3.OPEN_READWRITE | sqlite3.OPEN_CREATE, err => {
        if (err) {
            console.log("Failed to create/open SQL database!");
            exit(1);
        } else {
            console.log("Created/opened SQL database!")
        }
    });
    db.serialize(() => {
        INIT_SQL.replaceAll(/\t\r\n/g, ' ').split(';').filter(str => str).forEach((stmt) => db.run(stmt + ';'));
    });
    await wait(1000);
    for (let f of fs.readdirSync('output')) {
        const clazzName = f.split(".")[0];
        const clazzJson = JSON.parse(fs.readFileSync(`output/${f}`).toString().trim());

        console.log(`Parsing ${clazzName}`);
        for (let p of clazzJson) {
            const post = p?.result;

            if (!post) {
                console.error(`Could not read post in ${clazzName}...`)
                continue;
            }

            // https://stackoverflow.com/questions/5002111/how-to-strip-html-tags-from-string-in-javascript
            db.prepare(INSERT_PIAZZA_POST).run(
                post.nr ?? -1,
                clazzName,
                decodeHtmlEntity((post.history ?? [undefined])[0]?.subject) ?? "",
                decodeHtmlEntity((post.history ?? [undefined])[0]?.content) ?? "",
                decodeHtmlEntity(((post.history ?? [undefined])[0]?.content) ?? "").replace(/<\/?[^>]+(>|$)/g, ""),
                (post.folders ?? []).join(","),
                new Date(post.created),
                post.status,
                post.is_tag_good,
                err => {
                    if (err) {
                        console.error(`Encountered error...`)
                        console.error(e);
                    }
                }
            )
            await wait(25);
        }
    }
}

console.log(`Running in ${MODE} mode...`);

if (MODE === 'scrape') {
    await modeScrape();
} else if (MODE === 'store') {
    await modeStore();
} else {
    console.error(`${MODE} is not a valid mode.`)
}