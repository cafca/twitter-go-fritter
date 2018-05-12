const LibFritter = require('@beaker/libfritter')
const zip = require('jszip')

const fritter = new LibFritter()

// set to true to also import replies to tweets
const import_replies = false

async function getFritterArchive(fritter) {
  // Let user select a dat to use as target for import
  return DatArchive.selectArchive({
    title: 'Select your Fritter account',
    buttonLabel: 'Select',
    filters: {isOwner: true}
  })
}

function filterReplies(tweet) {
  // only return tweets that are not replies
  return import_replies ? true : tweet.in_reply_to_status_id == null
}

function linkUserMentions(tweet) {
  // replace twitter @mentions with http links
  tweet.entities.user_mentions.forEach(m => 
    tweet.text = tweet.text.slice(0, m.indices[0]) 
    + '> https://twitter.com/' + m.screen_name 
    + tweet.text.slice(m.indices[1])
  )
  return tweet
}

function replaceURLs(tweet) {
  // replace t.co shortened URLs with expanded URLs
  tweet.entities.media.forEach(m => 
    tweet.text = tweet.text.slice(0, m.indices[0]) 
    + m.expanded_url 
    + tweet.text.slice(m.indices[1])
  )
  return tweet
}

async function import_tweets(tweetArchive, archive) {
  // import tweets to dat social profile

  // extract wrapped tweet array from archive
  const tweets = tweetArchive[Object.keys(tweetArchive)[0]]

  appendLog(Object.keys(tweetArchive)[0], tweets.length)

  tweets
    .filter(filterReplies)
    // .map(linkUserMentions)
    // .map(replaceURLs)
    .forEach(tweet => {
      fritter.feed.post(archive, {
        text: tweet.text, 
        createdAt: Date.parse(tweet.created_at)
      })
    })
}

function appendLog(name, count) {
  document.getElementById('counter').innerHTML += "Importing " + count + " tweets from archive " + name + "<br />"
}

async function main() {
  fritter.db.open()
  var archive;

  // React to click on the target selector by asking for the target profile
  // and enabling the second button
  document.getElementById('target_profile').onclick = async function() {
    archive = await getFritterArchive()
    await fritter.db.indexArchive(archive.url)
    document.getElementById('twitter_archive').disabled = false
  }

  // Clicking the second button extracts the selected zip file with jszip
  // makes a list of all files in the `data/js/tweets` folder
  // and then eval's all of them to extract the contained tweets, which are
  // handed on to `import_tweets` for importing
  document.getElementById('twitter_archive').onchange = function(e) {
    zip.loadAsync(e.target.files[0])
      .then(function(zip) {
        const archiveList = zip
          .filter((path, _) => path.startsWith('data/js/tweets'))

        archiveList.forEach(async zippedArchive => {
          var Grailbird = { data: {} } // this is the target for the following eval
          eval(await zip.file(zippedArchive.name).async('string'))
          import_tweets(Grailbird.data, archive)
        })
      })
  }
}

window.onload = function() {
  main()
}