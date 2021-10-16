



### pollToot ƛ

on a timer searches twitter
any toot with media gets pushed onto the tooted photos queue

### slurp to labelling ƛ

reads from the tooted photos queue. sends the photos to rekognition and filters for those labelled "dog". Enqueues those toots on the dog toots queue

- [ ] should check all photos from the toots (not just the first)

### sling to slack ƛ

reads from the dog toots queue. and does what to them?

- [ ] should handle toot with multiple images