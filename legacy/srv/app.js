
GLOBAL.views_dir_path = "/blog-data/private/views";
GLOBAL.public_dir_path = "/blog-data/public";
GLOBAL.private_dir_path = "/blog-data/private";
GLOBAL.uploads_dir = "uploads"; // in public directory

// import GLOBAL modules
var express      = require('express');
var compression  = require('compression');
var cookieParser = require('cookie-parser');
var bodyParser   = require('body-parser');
var busboy       = require('connect-busboy');
var session      = require('express-session');
var RedisStore   = require('connect-redis')(session);

// import LOCAL modules
var posts = require('./modules/posts');
var pages = require('./modules/pages');
var lang_module  = require('./modules/lang');
var admin = require('./modules/admin');
var tools = require('./modules/tools');
var fbcomments = require('./modules/fbcomments');

// create an express server app
var app = express();

app.set('views', GLOBAL.views_dir_path);
app.set('view engine', 'jade');

// we use compression module to compress the responses
app.use(compression());

// cookie-parser as an 'optional secret string' param
app.use(cookieParser());

// not sure we need this one ... need confirmation (for regular forms maybe ??)
// parse application/json and application/x-www-form-urlencoded
app.use(bodyParser());

var options = {};
options.ttl = 60 * 60 * 5; // session ttl -> 5 hours

app.use(session({ store: new RedisStore(options), secret:'5c8be406c43595d4143b96043d0cfd6f'}))

// we handle "multipart/form-data" (file uploads) with busboy module
//app.use(busboy({immediate: true}));
app.use(busboy());

var oneDay = 86400000;

// 'static' middleware is still part on Express
app.use(express.static(GLOBAL.public_dir_path, { maxAge: oneDay }));

// forward www to non-www domain name
app.get('/*', function(req, res, next)
{
    if (req.headers.host.match(/^www/) != null )
	{
		res.redirect(301,'http://' + req.headers.host.replace(/^www\./, '') + req.url);
	}
    else next();
});

// redirects
app.get('/*', function (req, res, next)
{
    switch(req.url) {
        case "/comme-convenu":
            res.redirect(301,'https://commeconvenu.com');
            break;
        case "/studio":
            res.redirect(301,'https://commeconvenu.com');
            break;
        case "/studio2":
            res.redirect(301,'https://commeconvenu.com');
            break;
        case "/studio3":
            res.redirect(301,'https://commeconvenu.com');
            break;
        case "/studio4":
            res.redirect(301,'https://commeconvenu.com');
            break;
        case "/studio5":
            res.redirect(301,'https://commeconvenu.com');
            break;
        case "/studio6":
            res.redirect(301,'https://commeconvenu.com');
            break;
        case "/studio7":
            res.redirect(301,'https://commeconvenu.com');
            break;
        case "/studio8":
            res.redirect(301,'https://commeconvenu.com');
            break;
        case "/studio9":
            res.redirect(301,'https://commeconvenu.com');
            break;
        case "/studio10":
            res.redirect(301,'https://commeconvenu.com');
            break;
        case "/studio11":
            res.redirect(301,'https://commeconvenu.com');
            break;
        case "/studio12":
            res.redirect(301,'https://commeconvenu.com');
            break;
        case "/studio13":
            res.redirect(301,'https://commeconvenu.com');
            break;
        case "/studio14":
            res.redirect(301,'https://commeconvenu.com');
            break;
        default:
            next()
    }
})

// log the original url of all incoming requests
// app.use(log_request_url);

// blog modules
app.use('/admin', admin);

// answers with "success" without doing anything
// if robots fill trap fields such as "url" or "email"
app.post('*',tools.killStupidRobots);

// For anything posted by a non-admin user
// We check if the message was posted long enough after page rendering
// It helps getting rid of some spam robots

// a few users are also blocked for some reason...
// turning that off for now
//app.post('*',tools.killFastRobots);

app.use('/lang',lang_module.app);
app.use(lang_module.use);

app.use('/', posts.app);
app.use('/', pages.app);
app.use('*', posts.renderPosts2);


// TODO: move that on a config.js file
var port = 80;

app.listen(port, function() 
{
  console.log("Dockerblog started\nListening on " + port);
});


process.on('message', function(msg)
{
    if (msg == "fbcomments")
    {
    	fbcomments.collect();
    }
});

//---------------------------------------------------------------------
// UTILITY FUNCTIONS
//---------------------------------------------------------------------

//
// MIDDLEWARE
// log the incoming request
//
function log_request_url (req, res, next)
{
	console.log('--- ' + req.originalUrl);
	next();
}