// House rules, terms and privacy. Each is its own page, linked from the footer.
// The terms and privacy pages are drafts: have a lawyer read them before launch.
import { BOARD_ON } from "./route.js";
import { BOARD_RULES } from "./Board.jsx";

const UPDATED = BOARD_ON ? "October 17, 2026" : "October 6, 2026";

function Page({ title, children, draft }) {
  return (
    <section className="legal">
      <h2>{title}</h2>
      <p className="legal-date">Last updated {UPDATED}.{draft ? " Draft: not yet reviewed by a lawyer." : ""}</p>
      {children}
    </section>
  );
}

export function HouseRules() {
  return (
    <Page title="House rules">
      <ul>
        <li>This site never says who is legit and who is full of shit. You do. The tallies are your opinion, not ours.</li>
        <li>Quotes are word for word, with the date, the setting and a link.</li>
        <li>Votes show the exact motion, because a vote on an amendment is not a vote on the bill.</li>
        <li>The same method applies to every candidate in every party.</li>
        <li>Where a quote or a record is missing, the page says so. If a public records request can fill the gap, its status is shown.</li>
        <li>The numbers beside a name ("2 quotes · 1 record on file") count what is on file. They are not a score.</li>
        <li>Tallies stay hidden until you make your own call.</li>
        <li>"Most divided" ranks calls by how close the split is, never by which way it leans, and only once at least 10 people have called.</li>
        <li>With nobody picked, the file that opens first is chosen at random each visit, so no one is always on top.</li>
        <li>Paying for an evidence file buys the sources in one table. It never changes a tally.</li>
        <li>Corrections and candidate responses get posted with a source. Anyone can send one from any file or the footer; officials and their staff are read first.</li>
      </ul>
      {BOARD_ON && (
        <>
          <h3>Agree to Disagree, the comment board</h3>
          <ul>
            {BOARD_RULES.map((r) => <li key={r}>{r}</li>)}
            <li>Angelica, who opens each thread, is the site's AI host, not a person. She lays out the record and never takes a side.</li>
            <li>Comments that break these rules are hidden or removed, and accounts that keep breaking them are closed.</li>
          </ul>
        </>
      )}
      <h3>Source types</h3>
      <p>
        <span className="kind kind-official">Official record</span> opened on a government site.{" "}
        <span className="kind kind-press">News report</span> from a named outlet.{" "}
        <span className="kind kind-tracker">Vote tracker</span> from a third-party site, to be confirmed against the
        official roll call before launch. <span className="kind kind-records">Records request</span> documents an agency
        released to us.
      </p>
    </Page>
  );
}

export function Terms() {
  return (
    <Page title="Terms of service" draft>
      <h3>What this site is</h3>
      <p>
        Legit or Full of Shit puts public officials' and candidates' own words beside public records, with a link to
        the source of each. It is not affiliated with any candidate, party or campaign.
      </p>
      <h3>Whose opinion is whose</h3>
      <p>
        The quotes and records are reported facts with sources. "Legit" and "Full of shit" are opinions cast by
        visitors. The tallies add up those opinions. They are not statements by this site, and the site does not rate,
        score or issue a verdict on anyone.
      </p>
      <h3>Accuracy and corrections</h3>
      <p>
        We work to get every quote and record right, and we mark what is missing or unconfirmed. Mistakes can still
        happen. Check the linked source before relying on anything here. If something is wrong, tell us and we will
        correct it and say so. Anyone named on the site may send a response, which we will post with its source.
      </p>
      <h3>Using the site</h3>
      <ul>
        <li>One call per person on each item. Do not use scripts, bots or multiple devices to move a tally.</li>
        <li>Do not submit threats, private information about anyone, or anything unlawful through the Eagle or any form.</li>
        <li>Do not use anything here to harass or intimidate an official, a candidate or their family.</li>
      </ul>
      <h3>Emails you send</h3>
      <p>
        The Take action page drafts an email for you. You send it from your own account, in your own name. The site
        sends nothing on your behalf.
      </p>
      <h3>Purchases</h3>
      <p>
        Feed the Eagle tips are handled by PayPal. If the Feed the Eagle page says "Sandbox demo," no real money moves.
        Otherwise a tip is a real payment. It is optional, buys nothing, is not tax-deductible, and is not a contribution
        to any candidate or party. If you tipped by mistake, email eagle@legitorfullofshit.com to ask for a refund.
        Everything else in the store still runs in PayPal's sandbox during this prototype: no real money moves, nothing
        ships, and no order is binding. Real pricing, delivery and refund terms will be posted here before anything else is sold.
      </p>
      <h3>Prediction markets</h3>
      <p>The Odds page reports prices from outside markets as information. It is not a suggestion to trade, and it is not financial advice.</p>
      <h3>The Eagle</h3>
      <p>
        The Eagle is an AI research assistant. It can be wrong. It is limited to finding sources, and anything it finds
        should be checked at the link.
      </p>
      <h3>No warranty</h3>
      <p>
        The site is provided as is, without warranties, to the extent the law allows. These terms may change; the date
        above shows the latest version.
      </p>
    </Page>
  );
}

export function Privacy() {
  return (
    <Page title="Privacy" draft>
      <p>
        {BOARD_ON
          ? "The short version: no ads, no selling data. The only accounts are for the comment board, and they need just an email address."
          : "The short version: no accounts, no ads, no selling data."}
      </p>
      <h3>What is kept</h3>
      <ul>
        <li>
          <strong>Your calls.</strong> When you call someone Legit or Full of shit, the site stores the call with a
          random ID kept in your browser and a scrambled (hashed) form of your network address, used only to limit
          repeat voting. Your name is never asked for.
        </li>
        <li>
          <strong>Questions for the Eagle.</strong> What you type to the Eagle is saved so we know what to research
          next, and may be sent to an AI provider to run a search. Do not type personal details into it. If you choose to
          leave an email with a question, it is kept with that question and used only to send you what we find.
        </li>
        <li>
          <strong>Where you vote.</strong> The county and districts you pick are kept in your browser only. If you type your
          address to find your ballot, it is sent once, through our server, to the U.S. Census Bureau's public address
          lookup to find your districts. We do not store or log the address; only the districts are kept, in your browser.
        </li>
        <li>
          <strong>Corrections.</strong> The correction form sends your name, email and message through Formspree, which
          delivers it to us by email. We use your email only to reply about that correction.
        </li>
        <li>
          <strong>Email to eagle@legitorfullofshit.com.</strong> Messages are received through Resend, stored with the
          site, sorted by the Eagle (Anthropic's Claude) and copied to the people who run the site. Tips, corrections and
          general questions get one automatic receipt. Everything else is read by a person before any reply.
        </li>
        <li>
          <strong>"Tell me when my state opens."</strong> If you leave your email for a state that is not open yet, we keep
          it with the state and the issues you picked. We use it to email you when that state opens and, now and then, with
          site news. It is never sold or shared for anyone else's marketing. Ask at eagle@legitorfullofshit.com and we remove it.
        </li>
        <li>
          <strong>Following a candidate.</strong> If you follow someone, we keep your email or mobile number and who you follow,
          to tell you when something new is added to their file. Nothing about your calls is attached to it. Texts are sent only
          with the consent you checked, and replying STOP ends them. Never sold. Ask at eagle@legitorfullofshit.com and we remove it.
        </li>
        {BOARD_ON && (
          <li>
            <strong>Agree to Disagree, the comment board.</strong> If you join, we keep your email address and use it only to
            send you sign-in links. It is never shown on the board, sold or used for anything else. Your username, your animal
            and your comments are public, and so are the thumbs-up and thumbs-down totals (not who gave them). With each comment
            we keep a scrambled (hashed) form of your network address, to fight spam, and we store sign-in links and sessions
            only in scrambled form. Your browser keeps a sign-in key so you stay signed in; signing out removes it. You can ask
            for your account and comments to be deleted at eagle@legitorfullofshit.com.
          </li>
        )}
        <li>
          <strong>Usage counts.</strong> The site counts page views and a few actions, such as making a call, building an
          evidence file or starting checkout, with PostHog. It sets no cookies, records no sessions and sends no names,
          emails or form answers, and PostHog is set to discard network addresses. The people who run the site get a short
          email when someone starts checkout or pays, with no buyer details in it.
        </li>
        <li>
          <strong>Purchases.</strong> Checkout is handled by PayPal. We receive an order number, the item and the
          payment status. We never see card or bank details. For a shirt, PayPal passes the shipping name and address it
          collected to our server, which sends them straight to Printful to print and ship it. We do not keep the address.
        </li>
      </ul>
      <h3>What is not done</h3>
      <ul>
        <li>No advertising or cross-site tracking.</li>
        <li>No selling or renting of data.</li>
        <li>No record of which emails you send from the Take action page. Those go from your own email app.</li>
      </ul>
      <h3>Other companies involved</h3>
      <p>
        The site is hosted by Render, loads its typefaces from Google Fonts, uses the U.S. Census Bureau's geocoder for address lookups, PayPal for checkout, Printful to print and ship shirts, PostHog for usage counts, Resend for the site's email and
        Anthropic's Claude for the Eagle's research and email sorting. Each can see the technical details any website visit involves, such as your
        network address.
      </p>
      <h3>Your choices</h3>
      <p>
        Calls are final, like a vote: once you make a call on a person and an issue from a device, it cannot be changed or
        withdrawn there. Clearing your browser's site data removes the random ID. To ask
        for stored data to be deleted, write to eagle@legitorfullofshit.com.
      </p>
    </Page>
  );
}
