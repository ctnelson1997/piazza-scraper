import fetch from 'node-fetch'
import fs from 'fs'

const COOKIE = fs.readFileSync('cookie.secret').toString().trim()
const CSRF = fs.readFileSync('csrf.secret').toString().trim()
const PIAZZA_DATA = JSON.parse(fs.readFileSync('piazza.secret').toString().trim())

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

if(!fs.existsSync('output')) {
    console.log('Creating output directory.')
    fs.mkdirSync('output');
}

console.log("Beginning scraping...")
for(let k in PIAZZA_DATA) {
    console.log(`Beginning scraping for ${k}...`)
    await fetchPiazzaData(k, PIAZZA_DATA[k])
    console.log(`Done scraping for ${k}!`)
}
console.log("Done scraping!");
