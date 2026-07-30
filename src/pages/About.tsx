import { Link } from "react-router-dom";
import { StaticPage } from "@/components/StaticPage";

const About = () => (
  <StaticPage
    title="About ImageTools Hub"
    metaTitle="About ImageTools Hub — Private, Browser-Based Image Tools"
    metaDescription="ImageTools Hub builds free image and PDF utilities that run entirely in your browser. Learn how the tools work and why nothing is ever uploaded."
    path="/about"
  >
    <p>
      ImageTools Hub is a collection of free utilities for everyday image and document work:
      removing backgrounds, compressing, resizing, converting formats, upscaling and reading text
      from pictures. Every tool runs inside your browser using standard web APIs — Canvas,
      WebAssembly and the File API.
    </p>

    <h2>Why client-side?</h2>
    <p>
      Most online image tools upload your files to a server, process them there and hand back a
      download link. That means your photos, ID documents and screenshots sit on someone else's
      disk. We took the opposite approach: the processing code is shipped to your device and your
      files stay exactly where they are.
    </p>
    <ul>
      <li>No uploads, no storage, no server-side logs of your content.</li>
      <li>No accounts, no credits and no watermarks.</li>
      <li>Most tools keep working after you go offline, once the page has loaded.</li>
    </ul>

    <h2>What we build with</h2>
    <p>
      React, TypeScript and Vite for the app; Canvas and WebAssembly for the heavy lifting;
      on-device AI models for background removal and optical character recognition. The PDF side of
      the site uses pdf-lib and pdf.js for the same reason — everything local.
    </p>

    <h2>Get in touch</h2>
    <p>
      Feature requests and bug reports are welcome on the{" "}
      <Link to="/contact">contact page</Link>. If you are looking for a specific tool, the{" "}
      <Link to="/image-tools">image tools hub</Link> lists everything available today.
    </p>
  </StaticPage>
);

export default About;
