const { execFileSync } = require("node:child_process");
const { readdirSync } = require("node:fs");
const path = require("node:path");

exports.default = async function adhocSign(context) {
  if (context.electronPlatformName !== "darwin") {
    return;
  }

  const appPath = path.join(
    context.appOutDir,
    `${context.packager.appInfo.productFilename}.app`
  );
  const frameworksPath = path.join(appPath, "Contents", "Frameworks");

  const sign = target => {
    execFileSync("codesign", ["--force", "--sign", "-", target], { stdio: "inherit" });
  };

  // Sign inside out: nested code first, the outer bundle last. `codesign --deep`
  // is deprecated by Apple and mis-signs Electron's helper apps.
  const nestedBinaries = execFileSync("find", [
    frameworksPath,
    "-type",
    "f",
    "(",
    "-name",
    "*.dylib",
    "-o",
    "-name",
    "*.node",
    "-o",
    "-name",
    "chrome_crashpad_handler",
    ")",
  ])
    .toString()
    .split("\n")
    .filter(Boolean);

  for (const binary of nestedBinaries) {
    sign(binary);
  }

  for (const entry of readdirSync(frameworksPath)) {
    if (entry.endsWith(".framework") || entry.endsWith(".app")) {
      sign(path.join(frameworksPath, entry));
    }
  }

  sign(appPath);
};
