name: Release

on:
  push:
    tags:
      - "*"

jobs:
  release:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - name: Build Release Artifacts
        id: build
        run: |
          cd ./build && npm install && cd ../
          npm run build --if-present
          for d in .dist/*/*/ ; do tar -cvzf ${d%%/}-x.x.x.tar.gz ${d%%}*; done;
          if [[ ${{ github.ref }} == *"-"* ]]; then echo ::set-output isprerelease=true;else echo ::set-output isprerelease=false;fi
      - name: Create Release
        id: create_release
        uses: actions/create-release@v1.0.0
        env:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
        with:
          tag_name: ${{ github.ref }}
          release_name: Release ${{ github.ref }}
          draft: false
          prerelease: ${{ steps.build.outputs.isprerelease }}
      - name: Upload Release Artifacts
        uses: AButler/upload-release-assets@v2.0
        with:
          files: '.dist/**/*.tar.gz'
          repo-token: ${{ secrets.GITHUB_TOKEN }}
      - name: Publish
        run: |
          for d in .dist/*/*/ ; do cd ${d%%/} && npm publish; done;
