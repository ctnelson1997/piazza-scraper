# Piazza Scraper

In this directory, run `npm install`. Then, create a `piazza.secret` file of the form...

```json
{
    "CS123_F21": {
        "start_pid": 6,
        "end_pid": 84,
        "nid": "gofugrowuoqe"
    },
    "CS987_S21": {
        "start_pid": 6,
        "end_pid": 292,
        "nid": "i183910di308ff"
    }
}
```

... where `start_pid` is the starting post number, `end_pid` is the ending post number, and `nid` is the id of the class found in the url `https://piazza.com/class/xxxxxxxxxxxxxx`.

Also specify `cookie.secret` and `csrf.secret` files. The values for these files can be found by logging into Piazza via your browser, visiting a specific post in a classroom, and looking at the request to `https://piazza.com/logic/api?method=content.get` in your network log. Copy the values from the `cookie` and `csrf-token` headers respectively. These expire over time and may need to be updated periodically.

After setup, run `node app.js scrape` to begin scraping. Contents are saved in seperate JSON files underneath `output`. To save these JSON files to a db, run `node app.js store`