import { Link } from "react-router-dom";
import { StaticPage } from "@/components/StaticPage";

const Disclaimer = () => (
  <StaticPage
    title="Disclaimer"
    metaTitle="Disclaimer — ImageTools Hub"
    metaDescription="Accuracy, results and third-party content disclaimer for ImageTools Hub's free browser-based tools."
    path="/disclaimer"
  >
    <p>
      The information and tools on ImageTools Hub are provided for general use. We make no
      guarantees about accuracy, completeness or fitness for a particular purpose.
    </p>

    <h2>Processing results</h2>
    <ul>
      <li>
        Compression, resizing and format conversion are lossy operations. Output quality depends on
        your source file, your browser and your device.
      </li>
      <li>
        AI features — background removal, upscaling and OCR — are approximations. Extracted text may
        contain errors and should be proofread before use in anything important.
      </li>
      <li>
        Always keep the original file. We cannot recover an image or document after processing.
      </li>
    </ul>

    <h2>Not professional advice</h2>
    <p>
      Nothing on this site constitutes legal, security or professional advice. Tools that inspect
      documents report heuristic signals only and are not a substitute for a formal audit or a
      qualified professional's review.
    </p>

    <h2>External links and ads</h2>
    <p>
      We may link to third-party sites or display advertising. We do not control and are not
      responsible for their content, products or practices.
    </p>

    <h2>Availability</h2>
    <p>
      The site may be unavailable or change without notice. See the{" "}
      <Link to="/terms">terms of use</Link> for the full limitation of liability.
    </p>
  </StaticPage>
);

export default Disclaimer;
