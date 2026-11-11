# Keeping the blog and records requests current

For whoever maintains the site day to day. Everything is a data file; no page code needs to change.

## Rules

1. Only write what a source or a document supports. Quotes are word for word.
2. Never put the owner's address, phone or email in this repository. Published letters say
   "[requester's name, address, phone and email removed for publication]".
3. Do not characterize a candidate. Report what the record says and link it.
4. Work on a branch, open a pull request, and let the owner approve before it merges to `main`.

## Add a blog post

Edit `src/data/posts.js`. Add a new object at the TOP of the `posts` array:

```js
{
  id: "short-url-safe-id",
  title: "Plain headline",
  date: "October 14, 2026",
  dek: "One or two sentences under the headline.",
  blocks: [
    { p: "A paragraph." },
    { h: "A subheading" },
    { list: ["First item", "Second item"] },
    { quote: "Exact words.", who: "Speaker, setting, date", url: "https://source" },
    { links: [{ label: "Link text", url: "https://..." }] },
    { letter: "grand", label: "Request to the Grand County Sheriff's Office" },
  ],
}
```

`letter` keys come from `src/data/letters.js`. To publish a new letter, add its redacted text there.

## When an agency responds to a records request

1. In `src/data/utah.js`, find the request (`GRAND_ALPR_REQUEST` or `SLCO_SHERIFF_REQUEST`).
   Set `status` to `received`, `denied` or `appealed` and update `ref` with one factual sentence.
2. Put released documents in `public/records/` with clear names. Check each one for personal
   information about private individuals before publishing; leave those out and say so.
3. Add each record to the right person's `did` list with `kind: "records"`, the date, a one-line
   description and a `url` like `/records/file-name.pdf`.
4. Write a blog post saying what came back, including anything refused and the stated reason.
5. If a fee notice or a request to narrow arrives, do not answer it. Send it to the owner.

## Check your work

```
npm install
npm run dev      # open http://localhost:5173 and read the page
npm run build    # must finish without errors
```

Deadlines being tracked: 5 business days (about Oct 13) and 10 business days (about Oct 20) from
the October 6 filing. Salt Lake County request number: 26-3072.
