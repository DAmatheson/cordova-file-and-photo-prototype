(function() {
    // One pixel image used to easy clear out the src of img elements
    var onePixelImage = 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///ywAAAAAAQABAAACAUwAOw==';

    var utilities = {
        getFileNameFromURL: function(URL) {
            return URL.substr(URL.lastIndexOf('/') + 1);
        },

        getFileExtension: function(fileName) {
            return fileName.substr(fileName.lastIndexOf('.') + 1);
        }
    };

    var fileIO = {
        imagesFolder: 'profile_images',

        imagesFolderPath: function() {
            return cordova.file.dataDirectory + '/' + fileIO.imagesFolder + '/';
        },

        getImagesFolderDirectory: function(successCallback, errorCallback) {
            errorCallback = errorCallback || function(error) {
                console.log('Failed to resolve image directory: ' + error.code.toString());
            };

            window.resolveLocalFileSystemURL(
                    fileIO.imagesFolderPath(),
                    successCallback,
                    errorCallback
            );
        },

        shouldSavePicture: function() {
            var checkbox = document.getElementById('chkSaveLastPicture');

            return checkbox.checked;
        },

        getSavedImgURL: function() {
            var savedURL = localStorage.getItem('savedImageURL');

            return savedURL;
        },

        setSavedImgURL: function(url) {
            localStorage.setItem('savedImageURL', url);
        },

        updateSavedImageDisplay: function(imageURL) {
            if (!imageURL) {
                return;
            }

            var img = document.getElementById('lastSavedPicture');
            img.src = imageURL;

            var uriDisplay = document.getElementById('lastSavedPictureUri');
            uriDisplay.textContent = img.src;
        },

        removeFile: function(fileEntry, successCallback) {
            fileEntry.remove(
                function() {
                    console.log('previousSavedFileEntry.remove success');

                    if (successCallback) {
                        successCallback();
                    }
                }, 
                function(error) {
                    console.log('Failed to remove old image file: ' + error.code.toString());
                }
            );
        },

        removePreviousImage: function() {
            var oldFileName = fileIO.getSavedImgURL();

            if (oldFileName !== null && typeof(oldFileName) !== 'undefined') {
                window.resolveLocalFileSystemURL(
                    oldFileName,
                    function(previousSavedFileEntry) {
                        fileIO.removeFile(previousSavedFileEntry);
                    },
                    function(error) {
                        console.log('Failed to get previous saved file entry: ' + error.code.toString());
                    }
                );
            } 
        },

        cleanupTempFiles: function() {
            // This is appears to be an iOS only issue. I couldn't
            // find similar temp files anywhere in Android
            //
            // The only files that should exist in this directory for more than
            // two minutes (arbitrary cut-off point) are temp files created by
            // <input type="file"/> elements. We have no better way to clean them
            // up than to go through all the files in the temp directory
            // and delete those older than a certain cut-off point.

            var TWO_MINUTES_MS = 1000 * 60 * 2;

            // NOTE: Currently very hacky way to detect iOS. Cordova provides a plugin to do this better.
            if (!cordova.file.tempDirectory) {
                // We aren't on iOS. No need to clear tmp
                return;
            }

            var recursiveRead = function(parentEntry) {
                var reader = parentEntry.createReader();

                var readEntriesSuccessCallback = function(childEntries) {
                    // Handle the case of an empty directory
                    if (childEntries.length === 0) {
                        // fullPath appears to be relative to the directory first retrieved
                        // via resolveLocalFileSystemURL. In this case, it means tmp is /.
                        // We don't want to and can't remove tmp so don't attempt removal
                        // if we fullPath is /
                        if (parentEntry.fullPath !== '/') {
                            fileIO.removeFile(parentEntry);
                        }

                        return;
                    }

                    var filesRemoved = 0;

                    var metadataSuccessCallback = function(metadata) {
                        var dateModified = new Date(metadata.modificationTime);

                        if (new Date() - dateModified >= TWO_MINUTES_MS) {
                            // Async remove the stale file.
                            fileIO.removeFile(entry, function success() {
                                ++filesRemoved;

                                // Having removing the child file, check if it was the last 
                                // file in the parent directory. If so, remove the parent.
                                if (filesRemoved === childEntries.length && parentEntry.isDirectory) {
                                    fileIO.removeFile(parentEntry);
                                }
                            });
                        }
                    };

                    for (i = 0; i < childEntries.length; i++) {
                        var entry = childEntries[i];

                        if (entry.isDirectory) {
                            recursiveRead(entry);
                        } else {
                            // Async get the metadata for the file to 
                            // check if it is stale enough to delete.
                            entry.getMetadata(metadataSuccessCallback);
                        }
                    }
                };

                reader.readEntries(readEntriesSuccessCallback);
            };

            window.resolveLocalFileSystemURL(
                cordova.file.tempDirectory,
                function (fileEntry) {
                    recursiveRead(fileEntry);
                }
            );
        },

        writeFile: function(fileEntry, dataBlob, successCallback, errorCallback) {
            fileEntry.createWriter(function(fileWriter) {
                fileWriter.onwriteend = function() {
                    successCallback(fileEntry);
                };

                if (!errorCallback) {
                    fileWriter.onerror = function(error) {
                        console.log('Failed to write file: ' + e.toString());
                    };
                } else {
                    fileWriter.onerror = errorCallback;
                }

                fileWriter.write(dataBlob);
            });
        },

        moveFileAtURL: function(originalURL, successCallback) {
            if (!fileIO.shouldSavePicture()) {
                successCallback();

                return;
            }

            resolvedSuccess = function(fileEntry) {
                var fileExtension = utilities.getFileExtension(fileEntry.name);

                var fileName = new Date().getTime() + '.' + fileExtension;

                fileIO.getImagesFolderDirectory(function(directory) {
                    fileIO.removePreviousImage();

                    // Move the temorary file we've retrived into persistent storage
                    fileEntry.moveTo(directory, fileName, function(newFileEntry) {
                        successCallback();

                        var url = newFileEntry.toURL();

                        //var path = newFileEntry.fullPath;
                        //var internalURL = newFileEntry.toInternalURL();
                        // path: /profile_images/1462234822169.jpg
                        // url: file:///var/mobile/Containers/Data/Application/5FE57CF3-D463-487F-9852-335874B04ABC/Library/NoCloud/profile_images/1462234822169.jpg
                        // internalURL: cdvfile://localhost/library-nosync/profile_images/1462234822169.jpg
                        // console.log('\npath: ' + path + '\n' + 
                        //     'url: ' + url + '\n' + 
                        //     'internalURL: ' + internalURL
                        // );
                        fileIO.setSavedImgURL(url);

                        fileIO.updateSavedImageDisplay(url);
                    }, function(error) {
                        console.log('Failed to move file: ' + error.code.toString());
                    });

                });
            };

            window.resolveLocalFileSystemURL(
                originalURL,
                resolvedSuccess, 
                function(error) {
                    console.log('Failed to resolve local file URL: ' + error.code.toString());
                }
            );
        },

        saveFile: function(file) {
            fileIO.saveBlob(file, file.name);
        },

        saveBlob: function(blob, fileName) {
            if (!fileIO.shouldSavePicture()) {
                return;
            }

            fileIO.getImagesFolderDirectory(function success(directory) {
                fileIO.removePreviousImage();

                var extension = utilities.getFileExtension(fileName);

                var newFileName = new Date().getTime() + '.' + extension;

                var onWriteSuccess = function(fileEntry) {
                    var url = fileEntry.toURL();

                    fileIO.setSavedImgURL(url);

                    fileIO.updateSavedImageDisplay(url);
                };

                directory.getFile(
                    newFileName, 
                    { create: true, exclusive: true }, 
                    function (fileEntry) {
                        fileIO.writeFile(fileEntry, blob, onWriteSuccess);
                    }
                );
            });
        },

        initialize: function() {
            if (localStorage.getItem('imageDirectoryCreated')) {
                return;
            } else {
                document.addEventListener('deviceready', function() {

                    window.resolveLocalFileSystemURL(cordova.file.dataDirectory, function(directory) {

                        directory.getDirectory(fileIO.imagesFolder, { create: true }, function(directory) {

                            console.log('image directory created');
                            localStorage.setItem('imageDirectoryCreated', true);
                        }, function(error) {
                            console.log('Failed to create image directory: ' + error.code.toString());
                        })

                    }, function(error) {
                        console.log('Failed to resolve data directory: ' + error.code.toString());
                    });

                }, false);
            }
        }
    };

    var cordovaCamera = {
        pictureOptions: {},

        onGetPictureSuccess: function(base64OrURI) {
            var imageSrc;

            if (this.pictureOptions.destinationType === Camera.DestinationType.DATA_URL) {
                imageSrc = 'data:image/jpeg;base64,' + base64OrURI;
            } else {
                // Put the date after the hash to force a refresh due to changed URL
                imageSrc = base64OrURI + '#' + Date.now();
            }

            this.changeTakenPictureSettings('solid 1px black', imageSrc, base64OrURI);

            fileIO.moveFileAtURL(base64OrURI, function success(){
                // Clean up the intermediate files. Only used if:
                //  sourceType = Camera.Picture.SourceType.CAMERA
                //  destinationType = Camera.DestinationType.FILE_URI
                //  on iOS
                navigator.camera.cleanup();
            });
        },

        onGetPictureError: function(errorMessage) {
            this.changeTakenPictureSettings('solid 5px red', onePixelImage, errorMessage || '');
        },

        changeTakenPictureSettings: function(borderStyle, imageSrc, textOrURI) {
            var image = document.getElementById('takenPicture');
            image.style.border = borderStyle;
            image.src = imageSrc;

            var takenPictureUriElem = document.getElementById('takenPictureUri');
            takenPictureUriElem.textContent = textOrURI;
        },

        attachListeners: function() {
            // Note: This must be called after deviceready has happened

            // Doing it this way because Camera is not defined when 
            // app is initial defined
            this.pictureOptions = {
                destinationType: Camera.DestinationType.FILE_URI,
                sourceType: Camera.PictureSourceType.CAMERA,
                allowEdit: true,
                encodingType: Camera.EncodingType.JPEG,
                correctOrientation: true,
                saveToPhotoAlbum: false,
                cameraDirection: Camera.Direction.BACK
            };

            var takePictureHandler = function(source) {
                this.changeTakenPictureSettings('solid 2px green', onePixelImage, '');                                             

                navigator.camera.getPicture(
                    this.onGetPictureSuccess.bind(this), // Bind 'this' to cordovaCamera
                    this.onGetPictureError.bind(this), // Bind 'this' to cordovaCamera
                    this.pictureOptions
                );
            };

            document.getElementById('btnTakePicture').addEventListener(
                'click',
                takePictureHandler.bind(cordovaCamera)
            );
        }
    };

    var photoFileSelection = {
        setupPhotoCaptureViaInput: function() {
            // This way is currently looking like the preferred method

            var pictureInput = document.getElementById('pictureSelectionInput');

            pictureInput.onchange = function(event) {
                var files = event.target.files;
                var file;

                if (files && files.length > 0) {
                    file = files[0];

                    var pictureViaSelection = document.getElementById('pictureViaSelection');

                    // Revoke the previous object URL before changing to the new one
                    var onImgLoad = function() {
                        window.URL.revokeObjectURL(this.src);

                        // Remove this event listener
                        pictureViaSelection.removeEventListener('load', onImgLoad);
                    }

                    pictureViaSelection.addEventListener('load', onImgLoad);

                    var imgURL = window.URL.createObjectURL(file);

                    pictureViaSelection.src = imgURL;

                    var pictureViaSelectionUriElem = document.getElementById('pictureViaSelectionUri');
                    pictureViaSelectionUriElem.textContent = imgURL;

                    fileIO.saveFile(file);
                }
            }
        }
    };

    var photoDownload = {
        downloadAndSaveFile: function() {
            // Important Note:
            // I had to put http://cordova.apache.org into the Content-Security-Policy
            // element in index.html for this to work
            var url = 'http://cordova.apache.org/static/img/cordova_bot.png';
            var fileName = utilities.getFileNameFromURL(url);

            var xhr = new XMLHttpRequest();
            xhr.open('GET', url, true);
            xhr.responseType = 'blob';

            xhr.onload = function() {
                if (this.status === 200) {
                    var blob = new Blob([this.response], { type: 'image/png' });

                    var downloadPhoto = document.getElementById('downloadedPhoto');

                    // Revoke the previous object URL before changing to the new one
                    var onImgLoad = function() {
                        window.URL.revokeObjectURL(this.src);

                        // Remove this event listener
                        downloadPhoto.removeEventListener('load', onImgLoad);
                    }

                    downloadPhoto.addEventListener('load', onImgLoad);

                    var imgURL = window.URL.createObjectURL(blob);

                    var URLElem = document.getElementById('downloadedPhotoURL');
                    URLElem.textContent = imgURL;

                    downloadPhoto.src = imgURL;         

                    fileIO.saveBlob(blob, fileName);
                } else {
                    console.log('Non-200 response to image download: ' + this.status);
                }
            };

            xhr.send();
        },

        initialize: function() {
            var btnDownload = document.getElementById('btnDownloadPhoto');

            btnDownload.addEventListener(
                'click',
                photoDownload.downloadAndSaveFile.bind(photoDownload)
            );
        }
    };

    var fileUpload = {
        performFileUpload: function(file, fileName, outputElementId) {
            var serverAddress = 'http://192.168.1.100:8080';

            var fileKey = 'file';

            var formData = new FormData();
            formData.append(fileKey, file, fileName);

            var xhr = new XMLHttpRequest();

            xhr.open('POST', serverAddress + '/photo-upload/rest/upload/Image');

            xhr.onload = function() {
                var resultString;

                if (this.status === 201) {
                    resultString = 'Success. ';
                } else if (this.status === 404) {
                    resultString = '404. ';
                } else {
                    resultString = 'CONNECTION_ERR. ';
                }

                resultString += 'Status: ' + this.status + '; Response: ' + this.response;

                document.getElementById(outputElementId).textContent = resultString;
            };

            xhr.ontimeout = function() {
                var resultString = 'ontimeout. Status: ' + this.status + '; Response: ' + this.response;

                document.getElementById(outputElementId).textContent = resultString;
            };

            xhr.onerror = function() {
                var resultString = 'onerror. Status: ' + this.status + '; Response: ' + this.response;

                document.getElementById(outputElementId).textContent = resultString;
            };

            xhr.onabort = function() {
                var resultString = 'onabort. Status: ' + this.status + '; Response: ' + this.response;

                document.getElementById(outputElementId).textContent = resultString;
            };

            xhr.upload.onprogress = function(e) {
                var resultString = 'onprogress. ' + JSON.stringify(e);

                document.getElementById(outputElementId).textContent = resultString;
            };   

            xhr.send(formData);         
        },

        uploadSelection: function() {
            var selectionInput = document.getElementById('pictureSelectionInput');

            if (!selectionInput.files || selectionInput.files.length <= 0) {
                return;
            }

            var file = selectionInput.files[0];

            fileUpload.performFileUpload(file, file.name, 'uploadSelectedImageResult');
        },

        uploadFile: function() {
            if (!fileIO.getSavedImgURL()) {
                return;
            }

            // Get a FileEntry for the saved file
            window.resolveLocalFileSystemURL(
                fileIO.getSavedImgURL(), 
                function(fileEntry) {

                    // Get a File for the FileEntry
                    fileEntry.file(function(file) {
                        // Read in the file as an ArrayBuffer so we can make a Blob with it
                        var reader = new FileReader();

                        reader.onloadend = function() {
                            fileUpload.performFileUpload(
                                new Blob([this.result], { type: 'image/jpeg' }),
                                file.name, 
                                'uploadSavedImageResult'
                            );
                        }

                        reader.readAsArrayBuffer(file);
                    }, function(error) {
                        console.log('uploadFile.fileEntry.file - File Not Found. ' + error.code.toString());
                    });
                },
                function (error) {
                    console.log('uploadFile.resolveLocalFileSystemURL - Error. ' + error.code.toString());
                }
            );
        },

        initialize: function() {
            var btnUploadSelection = document.getElementById('btnUploadSelection');
            btnUploadSelection.addEventListener(
                'click', 
                fileUpload.uploadSelection.bind(fileUpload)
            );

            var btnUploadSavedImage = document.getElementById('btnUploadSavedImage');
            btnUploadSavedImage.addEventListener(
                'click',
                fileUpload.uploadFile.bind(fileUpload)
            );
        }
    }

    var app = {
        // Application Constructor
        initialize: function() {
            this.bindEvents();

            fileIO.initialize();
            photoDownload.initialize();
            fileUpload.initialize();
        },

        // Bind Event Listeners
        //
        // Bind any events that are required on startup. Common events are:
        // 'load', 'deviceready', 'offline', and 'online'.
        bindEvents: function() {
            document.addEventListener('deviceready', this.onDeviceReady, false);

            photoFileSelection.setupPhotoCaptureViaInput();
        },

        // deviceready Event Handler
        //
        // The scope of 'this' is the event. In order to call the 'receivedEvent'
        // function, we must explicitly call 'app.receivedEvent(...);'
        onDeviceReady: function() {
            app.receivedEvent('deviceready');

            cordovaCamera.attachListeners.call(cordovaCamera);

            app.loadLastImage();

            fileIO.cleanupTempFiles();
        },

        // Update DOM on a Received Event
        receivedEvent: function(id) {
            var parentElement = document.getElementById(id);
            var listeningElement = parentElement.querySelector('.listening');
            var receivedElement = parentElement.querySelector('.received');

            listeningElement.setAttribute('style', 'display:none;');
            receivedElement.setAttribute('style', 'display:block;');

            setTimeout(function() {
                parentElement.classList.remove('blink');
            }, 3000);
        },

        loadLastImage: function() {
            var savedURL = fileIO.getSavedImgURL();

            fileIO.updateSavedImageDisplay(savedURL);
        }
    };

    app.initialize();
})();
