import { Link } from "react-router-dom";
import { StaticPage } from "@/components/StaticPage";

const Terms = () => (
  <StaticPage
    title="Terms of Use"
    metaTitle="Terms of Use — ImageTools Hub"
    metaDescription="The terms that govern your use of ImageTools Hub's free browser-based image and PDF tools."
    path="/terms"
  >
    <p>
      By using ImageTools Hub you agree to these terms. If you do not agree, please stop using the
      site.
    </p>

    <h2>Using the tools</h2>
    <ul>
      <li>The tools are provided free of charge for personal and commercial use.</li>
      <li>You keep all rights to the files you process — we never obtain a licence to them.</li>
      <li>
        You are responsible for having the right to process the files you upload into the tools,
        including copyright and privacy rights of anyone depicted.
      </li>
      <li>
        You must not use the site to process unlawful material, to circumvent protections you are
        not authorised to remove, or to attack, scrape or overload the service.
      </li>
    </ul>

    <h2>No warranty</h2>
    <p>
      The tools are provided "as is" without warranty of any kind. Image processing is lossy by
      nature and results vary by input. Always keep a copy of your original files before processing
      them.
    </p>

    <h2>Limitation of liability</h2>
    <p>
      To the maximum extent permitted by law, we are not liable for any loss of data, loss of
      profit, or other indirect or consequential damages arising from use of the site.
    </p>

    <h2>Third-party services</h2>
    <p>
      Pages may include advertising or links to third-party sites. Their content and practices are
      their own responsibility. See the <Link to="/privacy">privacy policy</Link> for how
      advertising cookies are handled.
    </p>

    <h2>Changes</h2>
    <p>
      We may revise these terms as the service evolves. Continued use after an update means you
      accept the revised terms. Questions? Reach us on the <Link to="/contact">contact page</Link>.
    </p>
  </StaticPage>
);

export default Terms;
