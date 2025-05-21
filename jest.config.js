export default {
    testEnvironment: "node",
    setupFilesAfterEnv: ["<rootDir>/setupTests.js"], // Use the global setup file
    coveragePathIgnorePatterns: ["/node_modules/"],
    transform: {
      "^.+\\.js$": "babel-jest", // Use Babel to transform .js files
    },
  };