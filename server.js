var fs = require('fs');
var url = require('url');
var http = require('http');
var path = require('path');
var express = require('express');
var app = express();
var MongoClient = require('mongodb').MongoClient;
var port=process.env.PORT || 15454;
var found, id;
var urlString;
var jsonObject;
var mongoURL = process.env.MONGOLAB_URI || "mongodb://localhost:27017/url_shortener";


app.listen(port, function(){
   console.log('the port is running in ' + port); 
});
//display index
app.get('/', function(req, res){
    var file = path.join(__dirname, 'index.html');
    res.sendFile(file, function(err){
        if(err){
            console.log(err);
            res.status(500).send('Error');
        }
        else{
            console.log('Loaded file: ' + file);
        }
    });
});

app.get('/new/*?', function(req,response){
    MongoClient.connect(mongoURL, function(err, db) {
        if(err){ 
            console.log("Error!! Trying to connect!");
        }
        else{
            console.log('connected');
            var url = req.params[0];
            //validate url
            var regex=new RegExp(/[http]:[/]{2}[w]{3}[.][a-zA-Z0-9]+[.][com]/);
            //url is good, check if already in mongo db
            if(regex.test(url)){
                console.log('good url');
                //search for url
                mongoSearchUrl(db, url, function(res) { 
                    if (found==null){
                        console.log('url not found');
                        //get id
                        mongoSearchId(db,function(res){
                            id=res[0].seq;
                            console.log(id);
                            //string for short url
                            urlString = 'https://url-shortener-express-gomez-angel.c9users.io/'+id;
                            //insert url
                            mongoInsert(db, id, url, urlString, function(res){
                                //console.log(res);
                            });
                            //update sequence
                            mongoUpdate(db,function(res){
                               //console.log(res);
                               //return json
                               if(res){
                                   jsonObject = {'original_url' : url, 'short_url': urlString};
                                   console.log( 'original_url: ' + url + '     short_url:' + urlString);
                                   db.close();
                                   response.send(jsonObject);
                                }
                            });
                        });
                    }
                    else{
                        //the url is already in the database
                        console.log('url found');
                        console.log(res[0]);
                        //return json
                        jsonObject = {'original_url' : res[0].long_url, 'short_url': res[0].short_url};
                        console.log( 'original_url: ' + res[0].long_url + '     short_url:' + res[0].short_url);
                        db.close();
                        response.send(jsonObject);
                    }
                });
            }
            else{
                console.log('bad url');
                //return json
                jsonObject = {'original_url' : url, 'short_url': 'bad url'};
                console.log( 'original_url: ' + url + '  Error: bad url');
                db.close();
                response.send(jsonObject);
            }
        }
    });
});

app.get('/:id', function(req, res){
   var urlId = parseInt(req.params.id, 10);
   console.log(urlId);
   MongoClient.connect(mongoURL, function(err, db) {
        if(err){ 
            console.log("Error!! Trying to connect!");
        }
        else{
            mongoSearchUrlId(db, urlId, function(response){
                if(response){
                    res.redirect(response[0].long_url);
                }
            });
        }
    });
});


 //search the url
 function mongoSearchUrl(db,validate,callback){
    var collUrls = db.collection('urls');
    collUrls.find({long_url: validate}).toArray(function(err, urlFound){
        if(err){
            console.log(err);
            return;
        }
        found = urlFound[0];
        callback(urlFound);
    });
 }
 
 //search by id
 function mongoSearchUrlId(db, idUrl, callback){
    var collUrls = db.collection('urls');
    collUrls.find({id: idUrl}).toArray(function(err, idFound){
        if(err){
            console.log(err);
            return;
        }
        if(idFound){
            console.log(idFound[0]);
            callback(idFound);
        }
    });
 }

function mongoSearchId(db, callback){
    var collCounters = db.collection('counters');
    collCounters.find({_id: 'url_count'}).toArray(function(err, sequence) {
        if(err){
            console.log(err);
            return;
        }
        console.log(sequence[0]);
        //got the sequence id
        callback(sequence);
    });
}

function mongoInsert(db, id, long_url, short_url, callback){
    var collInsert = db.collection('urls');
    var document = {'id': id, 'long_url': long_url, 'short_url': short_url};
    collInsert.insert(document, function(err, res){
        if(err){
            console.log(err);
            return;
        }
        console.log('row inserted');
        //console.log(res);
        callback(res);
    });
}

function mongoUpdate(db, callback){
    var collUpdate = db.collection('counters');
    collUpdate.update(
        { _id: 'url_count' },
        { 
            $inc : { seq : 1 }
        }, function(err, res){
       if(err){
           console.log(err);
           return;
       }
       console.log('updated sequence');
       //console.log(res);
       callback(res);
    });
}
