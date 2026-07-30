import { Link } from "react-router-dom";
import { StaticPage } from "@/components/StaticPage";

const Privacy = () => (
  <StaticPage
    title="Privacy Policy"
    metaTitle="Privacy Policy — ImageTools Hub"
    metaDescription="How ImageTools Hub handles your data: images are processed locally and never uploaded. Details on cookies, advertising and analytics."
    path="/privacy"
  >
    <p>
      This policy explains what happens to your data when you use ImageTools Hub. The short version:
      your images and documents are processed on your own device and are never transmitted to us.
    </p>

    <h2>Files you process</h2>
    <p>
      Every tool on this site reads your file with the browser's File API and processes it in memory
      using Canvas or WebAssembly. Files are not uploaded, not stored, and not visible to us at any
      point. Closing or refreshing the tab discards them.
    </p>

    <h2>Information we collect</h2>
    <ul>
      <li>
        <strong>Nothing you upload.</strong> No image, PDF, extracted text or generated output ever
        reaches a server we control.
      </li>
      <li>
        <strong>Local browser storage.</strong> Some tools save your preferences (for example
        upscaler presets and your cookie choice) in localStorage on your device. You can clear this
        at any time through your browser settings.
      </li>
      <li>
        <strong>Standard server logs.</strong> Our hosting provider records the usual request
        metadata — IP address, user agent, requested URL and timestamp — to serve pages and prevent
        abuse.
      </li>
    </ul>

    <h2>Cookies and advertising</h2>
    <p>
      Essential cookies keep the site working. If advertising is enabled on a page, third-party ad
      partners such as Google AdSense may set cookies to measure and personalise the ads you see.
      You can decline non-essential cookies through the consent banner, and you can manage
      Google's own ad settings at{" "}
      <a href="https://adssettings.google.com" rel="noopener noreferrer" target="_blank">
        adssettings.google.com
      </a>
      .
    </p>

    <h2>AI models</h2>
    <p>
      The background remover and OCR tools download machine-learning models from a public CDN the
      first time you use them. Only the model files are transferred — your images are never sent
      along with the request, and the models are then cached by your browser.
    </p>

    <h2>Your rights</h2>
    <p>
      Because we do not collect personal content, there is generally nothing for us to export or
      delete. If you have a specific request about server logs, contact us via the{" "}
      <Link to="/contact">contact page</Link>.
    </p>

    <h2>Children</h2>
    <p>
      The site is not directed at children under 13 and we do not knowingly collect information from
      them.
    </p>

    <h2>Changes</h2>
    <p>
      We may update this policy as features change. Material updates will be reflected in the
      "last updated" date at the top of this page.
    </p>
  </StaticPage>
);

export default Privacy;
