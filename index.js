'use strict';
var libQ = require('kew');
//var libNet = require('net');
//var libFast = require('fast.js');
//var fs=require('fs-extra');
//var exec = require('child_process').exec;
//var nodetools = require('nodetools');
var playmusic = new (require('playmusic'))();

// Define the GoogleMusic class
module.exports = GoogleMusic;
function GoogleMusic(context) {
	var self = this;
	
	self.context = context;
	self.commandRouter = self.context.coreCommand;
	self.logger = self.context.logger;
	self.configManager = self.context.configManager;

};
 GoogleMusic.prototype.onVolumioStart = function() {
	var self = this;
	
	self.library;
	self.playlists = [];
	self.fmtPlaylists = [];
	self.playlistsTracks = []
	var configFile=self.commandRouter.pluginManager.getConfigurationFile(self.context,'config.json');
	self.config = new (require('v-conf'))();
	self.config.loadFile(configFile);
	self.email = self.config.get('username');
	self.pwd = self.config.get('password');


}
GoogleMusic.prototype.onStart = function() {
	var self = this
	var defer = libQ.defer()
	var promises = []
	
	
	if (self.email != '' && self.pwd != '') {
		playmusic.init({email: self.email, password: self.pwd}, defer.makeNodeResolver())
		defer.promise
			.then(function() {
				self.commandRouter.logger.info('GoogleMusic logged in successfuly')
				promises.push(self.getPlaylists())
				promises.push(self.getPlaylistsEntries())
				
				libQ.all(promises)
				.then(function(){
					self.addToBrowseSources()
				})
				.fail(function(){
					console.error(new Error("promises failed"))
				})

				return defer.promise
			})
			.fail(function(err){
				return libQ.reject(new Error())

			})
	}
	self.commandRouter.logger.info('GoogleMusic is not configured properly. Check account settings.')
	return libQ.reject();
}
GoogleMusic.prototype.getPlaylists = function() {
	var self = this
	var defer = libQ.defer()

	console.log('Fetching Google Music playlists...')
	if( self.playlists.length > 0) {
		console.log('Playlists already populated.')
		return libQ.resolve(self.playlists)
	}
	else {
		// gets all playlists
		playmusic.getPlayLists(defer.makeNodeResolver())
		defer.promise
		.then(function(data) {
			self.playlists = data.data.items
		})
		.fail(function(err){
			libQ.reject(new Error(err))
		})
	}
	return defer.promise
}
GoogleMusic.prototype.getPlaylistsEntries = function() {
	var self = this
	
	console.log('Fetching Google Music tracks...')
	if( self.playlistsTracks > 0) {
		console.log('Playlists already populated.')
		return libQ.resolve()
	}
	else {
		// gets all playlists tracks
		playmusic.getPlayListEntries(function(err, data) {
			if (err) {
				libQ.reject(new Error(err))
			}
			self.playlistsTracks = data.data.items
			return libQ.resolve()
		})
		
		// Defer not working
		/*
		playmusic.getPlayListEntries(defer.makeNodeResolver)
		defer.promise
		.then(function(data) {
			self.playlistsTracks = data.data.items
			console.log(self.playlistsTracks)
		})
		.fail(function(err){
			libQ.reject(new Error(err))
		})
		*/
	}
	
}
// Function for self.handleBrowseUri response
GoogleMusic.prototype.listPlayists = function(playlists) {
	var self = this

	// Create browsable object for playlists
	var browsableObj = {
		"navigation": {
			"prev": {
			  "uri": "googlemusic"
			}
		}
	}
	
	if (self.fmtPlaylists.length == 0) {
		var fmtList = []

		var fmtListItem = {
				"service": "googlemusic",
				"type": "folder",
				"artist": "",
				"album": "",
				"icon": "fa fa-folder-open-o",
		}

		for (var i in playlists) {
			var item = fmtListItem;
			item.title = playlists[i].name
			item.uri = "googlemusic/playlist/" + playlists[i].id
			fmtList.push(item)
		}
		

		self.fmtPlaylists = fmtList
	}

	browsableObj.navigation.list = self.fmtPlaylists
	libQ.resolve(browsableObj)
}
// Function for explodeUri when requesting playlist track
GoogleMusic.prototype.getPlaylistTracks = function(playlistId) {
	var self = this

	var tracks = []
	for( i in self.playlistsTracks ) {
		console.log(playlistsTracks[i])
		tracks.push( self.searchObj(self.playlists, playlistsTracks[i]) )
	}
	console.log(tracks)
}
GoogleMusic.prototype.explodeUri = function(uri) {
	var self = this;
	var defer = libQ.defer();
	var uriSplitted;
	var response;
	
	console.log(uri.startsWith('googlemusic/playlists'))

	if (uri.startsWith('googlemusic/playlists')) {
		
		uriSplitted=uri.split('/')
		var playlistId = uriSplitted[2]
		//var curPlaylist = self.searchObj(self.playlists, uri)
		//console.log(uri)
		//console.log(playlistId)
		//console.log(curPlaylist)

		//defer.resolve(self.getPlaylistTracks(uriSplitted[2]))
		defer.resolve([{
		    uri: 'googlemusic/playlists/' + playlistId,
		    service: 'googlemusic',
		    name: 'name',
		    artist: 'artist',
		    album: 'album',
		    type: 'track',
		    tracknumber: 0,
		    albumart: null,
		    duration: '00:00:00',
		    trackType: 'mp3'
		}])
	}

	return defer.promise;
}
GoogleMusic.prototype.handleBrowseUri=function(curUri) {
    var self=this;
	
	self.commandRouter.logger.info(curUri);
	var response;

	if (curUri.startsWith('googlemusic')) {
		if(curUri=='googlemusic')
		{
			response=libQ.resolve({
				navigation: {
					prev: {
						uri: 'googlemusic'
					},
					list: [
						{
							service: 'googlemusic',
							type: 'folder',
							title: 'My Playlists',
							artist: '',
							album: '',
							icon: 'fa fa-folder-open-o',
							uri: 'googlemusic/playlists'
						}
					]
				}
			});
		}
		else if(curUri == 'googlemusic/playlists')
		{
			response=self.listPlayists(self.playlists)
			console.log('should find playlists')
		}
		else if (curUri.startsWith('googlemusic/playlists')) 
		{
			response=self.listPlayists(self.playlists)
			console.log('should find the rest')
		}
	}
	
    return response;
}
GoogleMusic.prototype.addToBrowseSources = function () {
	var data = {name: 'Google Music', uri: 'googlemusic',plugin_type:'music_service',plugin_name:'googlemusic'};
	this.commandRouter.volumioAddToBrowseSources(data);
};
GoogleMusic.prototype.getUIConfig = function() {
	var self = this;
	var defer = libQ.defer();

	var lang_code = this.commandRouter.sharedVars.get('language_code');

	self.commandRouter.i18nJson(__dirname+'/i18n/strings_'+lang_code+'.json',
		__dirname+'/i18n/strings_en.json',
		__dirname + '/UIConfig.json')
		.then(function(uiconf)
		{

			uiconf.sections[0].content[0].value = self.config.get('username');
			uiconf.sections[0].content[1].value = self.config.get('password');
			uiconf.sections[0].content[2].value = self.config.get('deviceId');
			
			self.commandRouter.logger.info(self.config.get('username'));
			

			defer.resolve(uiconf);
		})
		.fail(function()
		{
			defer.reject(new Error());
		});

	return defer.promise;
};
GoogleMusic.prototype.saveGoogleAccount = function (data) {
	var self = this;

	var defer = libQ.defer();

	self.config.set('username', data['username']);
	self.config.set('password', data['password']);
	self.config.set('allaccess', data['allaccess']);
	
	return defer.promise;
};
GoogleMusic.prototype.getConfigurationFiles = function() {
	return ['config.json'];
}
GoogleMusic.prototype.searchObj = function(obj, query) {
	
	if ( typeof obj[key] != 'function' &&  typeof obj[key] != 'prototype') {
		
		for (var key in obj) {
			
			var value = obj[key];

			if (typeof value === 'object') {
				searchObj(value, query);
			}

			if (value === query) {
				console.log('property=' + key + ' value=' + value);
				return obj;
			}
			
		}
		
	}
}