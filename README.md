# YouTube Popout Transcript Viewer
## By Steven Nyman

JavaScript bookmarklet for viewing YouTube video transcripts. This differs from YouTube's built-in transcript feature because it places the transcript into a separate window which means videos can be watched full screen while viewing the transcript on a second monitor. Additionally, while YouTube's built-in transcript feature primarily shows upcoming lines to be spoken, this bookmarklet shows the current and previous lines of spoken text, which makes it easier to look back if you missed a line in the video.

## Installation
To install this script, create a new bookmark and paste the contents of yt-transcript.min.txt as the URL. To use this script, navigate to any YouTube video and click on the bookmark you created.

## Compiling
Minify yt-transcript.js. Replace %60 with %2560 (necessary for percent-encoding the URL). Prepend `javascript:` to the beginning of the file.

AGPL License