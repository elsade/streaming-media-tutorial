# streaming-media-tutorial
A demonstration of a synchronized streaming media station using Node.js and Socket.io.

Installation/run instructions:

1) In the root directory, run 'npm install'

2) Create one or more subdirectories in the static/stations folder.

3) Add music to the these directories.

4) Run using the command, 'node server.js'

TODO:

Use REST APIs instead of socket messaging for the login and station retrieval.
Launch each station as a separate process to improve scaling using the cluster module.
Switch the client to a modern framework.

Known Issues:

Sometimes duplicate client events are fired.
The progress report baton is not passed correctly if someone leaves a station.

