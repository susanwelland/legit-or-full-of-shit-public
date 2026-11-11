// Corrections and responses from readers and from the people named on the site. Submissions go to
// Formspree, which emails them to the site. Officials and their staff are flagged so they are read first.
import { useState } from "react";
import { useForm, ValidationError } from "@formspree/react";

const FORM_ID = "xaeqjare";

export default function Corrections({ about = "", page = "" }) {
  const [state, handleSubmit] = useForm(FORM_ID);
  const [official, setOfficial] = useState(false);
  const [who, setWho] = useState(about);

  if (state.succeeded) {
    return (
      <section className="legal corrections">
        <h2>Thank you</h2>
        <p>
          Your correction is in. Every one is checked against the source you sent. If we change the page, the change is
          noted on it with the date.
        </p>
      </section>
    );
  }

  return (
    <section className="legal corrections">
      <h2>Send a correction</h2>
      <p>
        Found a quote that is wrong, a vote attached to the wrong motion, or something missing that changes the
        picture? Tell us, with the source. If you are the official named, or work for them, check the box: those are read
        first, and your response can be posted with its source.
      </p>
      <form className="cform" onSubmit={handleSubmit}>
        <input type="hidden" name="_subject" value={`${official ? "PRIORITY (official or staff): " : ""}Correction about ${who || "the site"}`} />
        <label htmlFor="c-name">Your name
          <input id="c-name" name="name" required autoComplete="name" />
        </label>
        <label htmlFor="c-about">The official or candidate this is about
          <input id="c-about" name="about" required value={who} onChange={(e) => setWho(e.target.value)} />
        </label>
        <label htmlFor="c-page">The page it is on
          <input id="c-page" name="page" type="url" defaultValue={page} placeholder="https://legitorfullofshit.com/utah/..." />
        </label>
        <label htmlFor="c-wrong">What is wrong
          <textarea id="c-wrong" name="what_is_wrong" required rows={4} />
        </label>
        <ValidationError prefix="This" field="what_is_wrong" errors={state.errors} />
        <label htmlFor="c-source">Your source or evidence
          <textarea id="c-source" name="source" required rows={3} placeholder="A link to the record, the article, the video with a time stamp…" />
        </label>
        <label htmlFor="c-email">Your email
          <input id="c-email" name="email" type="email" required autoComplete="email" />
        </label>
        <ValidationError prefix="Email" field="email" errors={state.errors} />
        <label className="ccheck" htmlFor="c-official">
          <input id="c-official" type="checkbox" name="named_official_or_staff" value="yes" checked={official} onChange={(e) => setOfficial(e.target.checked)} />
          I'm the named official or their staff
        </label>
        <ValidationError errors={state.errors} />
        <button type="submit" id="c-send" disabled={state.submitting}>{state.submitting ? "Sending…" : "Send the correction"}</button>
        <p className="call-note">We use your email only to reply about this correction. See the privacy page.</p>
      </form>
    </section>
  );
}
