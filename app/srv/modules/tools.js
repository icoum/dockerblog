var MIN_TIME_BETWEEN_PAGE_RENDERING_AND_POST = 5; // in seconds

var express = require('express');
var app = express();

app.set('views', GLOBAL.views_dir_path);
app.set('view engine', 'jade');

var db = require('./db').connect();
var crypto = require('crypto');
var keys = require('./keys');
var lang_module = require('./lang');

var nodemailer = require("nodemailer");
var transporter;



exports.returnJSON = function(res,obj)
{
  var body = JSON.stringify(obj);
  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Content-Length', body.length);
  res.end(body);
}


exports.renderJade = function(req,res,page,options)
{		
	// Store the last time a page was rendered in session
	// Used to detect robots when receiving post messages from non-admin users
	req.session.lastPageRenderTime = new Date().getTime();
	options.timestamp304 = req.session.lastPageRenderTime;
	
	if (req.params.lang)
		options.lang = req.params.lang;
	else
		options.lang = lang_module.get(req);
	
	keys.getAllKeysAndValues(req,function(err,values)
	{
		if (!err)
		{
			var keys = values;
			if (! keys ) keys = {};
			
			options.keys = keys;
			res.render(page,options);
		}
		else
		{
			options.keys = {};
			res.render(page,options);
		}
	});
}


exports.killFastRobots = function(req,res,next)
{
	if (req.session.lastPageRenderTime)
	{
		var lastPageRenderTime = new Date(req.session.lastPageRenderTime);
		var now = new Date();
		
		var diff = (now - lastPageRenderTime) / 1000;
		
		if (diff >= MIN_TIME_BETWEEN_PAGE_RENDERING_AND_POST)
		{	
			next();			
		}
		else
		{
			var obj = {"success":false};
		
			var body = JSON.stringify(obj);
			res.setHeader('Content-Type', 'application/json');
			res.setHeader('Content-Length', body.length);
			res.end(body);
		}
	}
	else
	{
		var obj = {"success":false};
		
		var body = JSON.stringify(obj);
		res.setHeader('Content-Type', 'application/json');
		res.setHeader('Content-Length', body.length);
		res.end(body);
  
	}
}




function sendMailHavingTransporter(to,from,title,text,html)
{
	if (transporter)
	{
		var mailOptions = {from:from,to:to,subject:title,text:text,html:html};

		transporter.sendMail(mailOptions, function(error, info)
		{
		    if(error)
		    {
		        console.log(error);
		    }
		    else
		    {
		        console.log('Message sent: ' + info.response);
		    }
		});
	}
}


exports.deleteMailTransporter = function()
{
	delete transporter;
}

// html is optional
exports.sendMail = function(to,from,title,text,html)
{
	// transporter has not been initialized
	// let's do it now

	if (!transporter)
	{
		console.log("generate transporter");
		
		fs.readFile(GLOBAL.private_dir_path + '/email_config.json', function (err, data)
		{
			if (err)
			{
				console.log("can't find email credentials, email can't be sent")
			}
			else
			{
				var config = JSON.parse(data);
				transporter = nodemailer.createTransport(config);

				sendMailHavingTransporter(to,from,title,text,html);
			}
		});
	}
	else // we already have a transporter!
	{
		console.log("already have a transporter!");

		sendMailHavingTransporter(to,from,title,text,html);
	}

	//console.log("sendMail");
	//console.log("to " + to);
	//console.log("from " + from);
	//console.log("title " + title);
	//console.log("text " + text);
	//console.log("html " + html);

	/*var mailObject = {};
	mailObject.from = from;
	mailObject.to = to;	
	mailObject.subject = title;	
	mailObject.text = text;
	
	if (html)
		mailObject.html = html;*/	
		
	//console.dir(mailObject);
	
	//mail(mailObject);
}



exports.randomHash = function(nbBytes)
{
	return crypto.randomBytes(nbBytes).toString('hex');
}

exports.sha1 = function(string)
{
	var shasum = crypto.createHash('sha1');
	shasum.update(string);
	return shasum.digest('hex');
}

exports.md5 = function(string)
{
	var sum = crypto.createHash('md5');
	sum.update(string);
	return sum.digest('hex');
}



