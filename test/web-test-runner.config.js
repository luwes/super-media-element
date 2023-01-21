export default {
  nodeResolve: true,
  groups: [
    {
      name: 'eager-upgrade',
      files: 'test/**/*test.js',
      testRunnerHtml: testFramework =>
        `<html>
          <head>
            <script src="./dist/super-media-element.js"></script>
            <script type="module" src="${testFramework}"></script>
          </head>
          <body>
            <super-video
              id="superVideo"
              muted
              src="http://stream.mux.com/DS00Spx1CV902MCtPj5WknGlR102V5HFkDe/low.mp4"
            ></super-media>
          </body>
        </html>`,
    },
    {
      name: 'lazy-upgrade',
      files: 'test/**/*test.js',
      testRunnerHtml: testFramework =>
        `<html>
          <head>
            <script type="module" src="./super-media-element.js"></script>
            <script type="module" src="${testFramework}"></script>
          </head>
          <body>
            <super-video
              id="superVideo"
              muted
              src="http://stream.mux.com/DS00Spx1CV902MCtPj5WknGlR102V5HFkDe/low.mp4"
            ></super-media>
          </body>
        </html>`,
    },
  ],
};
