{
  description = "Luma Rust/SDL2 development and packaging environment";

  inputs = {
    nixpkgs.url = "github:NixOS/nixpkgs/nixpkgs-unstable";
    rust-overlay = {
      url = "github:oxalica/rust-overlay";
      inputs.nixpkgs.follows = "nixpkgs";
    };
  };

  outputs =
    { nixpkgs, rust-overlay, ... }:
    let
      systems = [
        "aarch64-darwin"
        "aarch64-linux"
        "x86_64-linux"
      ];
      forEachSystem =
        f:
        nixpkgs.lib.genAttrs systems (
          system:
          f (
            import nixpkgs {
              inherit system;
              overlays = [ rust-overlay.overlays.default ];
            }
          )
        );
      project = builtins.fromJSON (builtins.readFile ./package.json);
      bunVersion = nixpkgs.lib.removePrefix "bun@" project.packageManager;
    in
    {
      devShells = forEachSystem (
        pkgs:
        let
          # Match the native CI toolchain and include the TV's soft-float Rust std.
          rust = pkgs.rust-bin.fromRustupToolchainFile ./rust-toolchain.toml;
          # Keep the runtime aligned with CI without moving the entire nixpkgs pin.
          bunSource = {
            aarch64-darwin = {
              archive = "bun-darwin-aarch64.zip";
              sha256 = "c240d7f0ccb90c263a849fcdb09b7ee62630d921348ed6aafda86b9d577bc510";
            };
            aarch64-linux = {
              archive = "bun-linux-aarch64.zip";
              sha256 = "baa6bb36f51d6e58561e02bbea825038a9df454f673d6d776e8bbf86f8c7850e";
            };
            x86_64-linux = {
              archive = "bun-linux-x64-baseline.zip";
              sha256 = "e0446eb55995772eb9894bebae9a6be368d985a8b9271ee124486f9946eedd76";
            };
          }.${pkgs.stdenv.hostPlatform.system};
          bun = pkgs.bun.overrideAttrs (_: {
            version = bunVersion;
            src = pkgs.fetchurl {
              url = "https://github.com/oven-sh/bun/releases/download/bun-v${bunVersion}/${bunSource.archive}";
              inherit (bunSource) sha256;
            };
          });
        in
        {
          default = pkgs.mkShell ({
            name = "luma";
            packages = [
              bun
              rust
              pkgs.pkg-config
              pkgs.SDL2
              pkgs.glslang
              pkgs.woff2
              (pkgs.python3.withPackages (python: [ python.fonttools ]))
              pkgs.cmake
              pkgs.git
            ]
            ++ pkgs.lib.optionals pkgs.stdenv.hostPlatform.isLinux [
              pkgs.libGL
              pkgs.mesa
              pkgs.xvfb-run
            ];
          });
        }
      );

      formatter = forEachSystem (
        pkgs:
        pkgs.writeShellApplication {
          name = "luma-nixfmt";
          runtimeInputs = [ pkgs.nixfmt ];
          text = ''
            exec nixfmt "$@" flake.nix
          '';
        }
      );
    };
}
