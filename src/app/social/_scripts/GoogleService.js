(function() {

  'use strict';  

  function GoogleService($rootScope, $state, $q, $mdDialog, securityContextService) {        
    
    var identity = $q.defer();

    function awsRefresh() {
        var deferred = $q.defer();
        AWS.config.credentials.refresh(function(err) {
            if (err) {
                deferred.reject(err);
            } else {
                deferred.resolve(AWS.config.credentials.identityId);
            }
        });
        return deferred.promise;
    }

    function refresh() {
      return gapi.auth2.getAuthInstance().signIn({
        prompt: 'login'
      }).then(function(userUpdate) {
        var creds = AWS.config.credentials;
        var newToken = userUpdate.getAuthResponse().id_token;
        creds.params.Logins['accounts.google.com'] = newToken;
        return awsRefresh();
      });
    }
    
    function onSignIn(googleUser) {
      var profile = googleUser.getBasicProfile();
      console.log('ID: ' + profile.getId());
      console.log('Name: ' + profile.getName());
      console.log('Image URL: ' + profile.getImageUrl());
      console.log('Email: ' + profile.getEmail());

      var id_token = googleUser.getAuthResponse().id_token;
      AWS.config.update({
        region: TIPO_CONSTANTS.COGNITO.REGION,
        credentials: new AWS.CognitoIdentityCredentials({
            IdentityPoolId: TIPO_CONSTANTS.COGNITO.IDENTITY_POOL_ID,
            Logins: {
                'accounts.google.com': id_token
            }
        })
      }); 
      var securityContext = {
        'tokenDetails.access_token': googleUser.getAuthResponse().id_token,
        'loggedInUser': googleUser.getBasicProfile().getName()
      };
      securityContextService.saveContext(securityContext);       

      awsRefresh().then(function(id) {
          identity.resolve({
              id: id,
              email: googleUser.getBasicProfile().getEmail(),
              refresh:refresh
          });          

          if ($rootScope.$previousState.abstract === true) {
            $state.go('dashboard');                
          } else {
            $state.go($rootScope.$previousState, $rootScope.$previousParams);
          }
          var alertDlg = $mdDialog.alert()
              .title('Login')
              .content('User ' + profile.getName() + ' login successfully')
              .ok('Close');
          $mdDialog.show(alertDlg);
      });              
    }

    function signOut() {
      var auth2 = gapi.auth2.getAuthInstance();
      auth2.signOut().then(function () {
        $state.go('login');
      });
      return true;
    }

    function isSignedIn() {
      return gapi.auth2? gapi.auth2.getAuthInstance().isSignedIn.get(): false;
    }

    return {
      onSignIn: onSignIn,
      signOut: signOut,
      isSignedIn: isSignedIn
    };
  }

  angular.module('tipo.social')
  .service('googleService', GoogleService);

})();