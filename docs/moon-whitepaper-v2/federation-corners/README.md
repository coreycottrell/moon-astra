# Federation corners publication

Canonical idea paper: `/home/corey/projects/moon-civilization/ideas/federation-corners-and-colony-organs.md`.
Source and build entrypoint: this directory. Python `markdown` renders the paper; HTML/CSS/SVG and small local JavaScript provide an illustrative four-stage colony plan. No WebGL, game connection, provider call or account access.

Build into a chosen output directory:

    python3 build.py /path/to/site/moon-astra-whitepaper/federation-corners

The publication lives at https://ai-civ.com/moon-astra-whitepaper/federation-corners/ . The current operator receipt determines whether a prepared page has been published. The diagram's stages are illustrative and are not a traffic simulation or a build-time forecast. All federation/organ/expedition mechanics are explicitly proposed.

The parent whitepaper research index is maintained in `../research-library.html`; `../update-research-library.py` updates both the canonical parent template and a chosen published HTML copy. Preserve the existing 24 chapters and their print/download editions. Never replace a complete website with this small report directory; use the established full-site Git preview/promotion workflow.
