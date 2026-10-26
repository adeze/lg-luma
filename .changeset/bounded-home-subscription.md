---
'lg-luma': patch
---

Keep Home lifecycle subscriptions open until explicitly ended and terminate oversized replies before buffering them without a bound. Reject unsupported graphics contexts and incomplete framebuffers when damage verification is requested. Reduce repeated app sorting and rendering work.

Update the Rust toolchain to 1.99.1 and the SVG asset compiler to usvg 0.49. Require an explicit deployment device and select the pinned rustup compiler for TV builds when rustup is available.

Reject TV executables with an incompatible loader, ARM ABI or glibc requirement during build and packaging.

Migrate host tooling, lockfiles and CI to Bun. Add strict TypeScript checks and offline linking of every desktop/GLES2 shader variant, sharing runtime shader prefixes with the validator. Provide an isolated Docker binary checker without installing extra software on the TV.
