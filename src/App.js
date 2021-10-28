import React from 'react';
import './css/App.css';
import { BrowserRouter as Router, Route, Switch, Redirect, Link } from 'react-router-dom';
import Home from "./Home";
import LoggedInHome from "./LoggedInHome";
import Login from "./Login";
import SetPage from "./SetPage";
import GroupPage from "./GroupPage";
import GroupStats from "./GroupStats";
import UserGroups from "./UserGroups";
import Settings from "./Settings";
import Progress from "./Progress";
import CreateSet from "./CreateSet";
import UserSets from "./UserSets";
import EditSet from "./EditSet";
import Error404 from "./Error404";
import History from "./History";
import MistakesHistory from "./MistakesHistory";
import TermsOfService from "./TermsOfService";
import PrivacyPolicy from "./PrivacyPolicy";
import Button from "./Button";
import { CheckRounded as CheckRoundedIcon } from "@material-ui/icons";
import Loader from "./puff-loader.svg";

import RouteChangeTracker from './RouteChangeTracker';

import Cookies from 'universal-cookie';

import styled, { keyframes } from "styled-components";

import firebase from "firebase/app";
import "firebase/auth";
import "firebase/functions";
import "firebase/app-check";
import "firebase/firestore";
import "firebase/analytics";

// TODO: app check debug token set in index.html - remove before deploy

const firebaseConfig = {
  apiKey: "AIzaSyCv5A51xC90hu-Tfw9F7yPasyslzNY0bP4",
  authDomain: "parandum.mgrove.uk",
  projectId: "parandum",
  storageBucket: "parandum.appspot.com",
  messagingSenderId: "639286122165",
  appId: "1:639286122165:web:62f1e81a35e26ec4e5d0fc",
  measurementId: "G-MX83SH11CJ"
};
firebase.initializeApp(firebaseConfig);
const appCheck = firebase.appCheck();
appCheck.activate(
  "6LfxoQAcAAAAACEuhx1aaBl69svfRDDlq9Md96we",
  true
);

// firebase.functions().useEmulator("localhost", 5001);
// firebase.auth().useEmulator("http://localhost:9099");
// firebase.firestore().useEmulator("localhost", 8080);
const functions = firebase.app().functions("europe-west2");//firebase.functions();

const fadeIn = keyframes`
  from {
    opacity: 0;
  }

  to {
    opacity: 1;
  }
`;

const fadeOut = keyframes`
  from {
    opacity: 1;
  }

  to {
    opacity: 0;
  }
`;

const Fade = styled.div`
  display: inline-block;
  visibility: ${props => props.out ? 'hidden' : 'visible'};
  animation: ${props => props.out ? fadeOut : fadeIn} 0.2s linear;
  transition: visibility 0.2s linear;
`;

firebase.firestore().enablePersistence()
  .catch((err) => {
    if (err.code === 'failed-precondition') {
      console.log("Offline persistence can only be enabled in one tab at a time");
    } else if (err.code === 'unimplemented') {
      console.log("Your browser doesn't support offline persistence");
    }
  });

const themes = [
  "default",
  "pink",
  "maroon",
  "red",
  "orange",
  "yellow",
  "green",
  "light-blue"
];

const db = firebase.firestore();

// stop automatic logging of page views
window.dataLayer = window.dataLayer || [];
function gtag() {window.dataLayer.push(arguments); }
gtag('set', {'send_page_view': false });

const analytics = firebase.analytics();

class App extends React.Component {
  constructor(props) {
    super(props);
    
    this.state = {
      user: null,
      userDataPresent: false,
      sound: true,
      theme: "default",
      coloredEdges: false,
      pageLoading: true,
    };
    
    this.page = {
      loaded: () => !this.state.pageLoading,
      load: () => {
        this.setState({
          pageLoading: false,
        });
      },
      unload: () => {
        this.setState({
          pageLoading: true,
        });
      },
    };
  }

  componentDidMount() {
    firebase.auth().onAuthStateChanged(async (userData) => {
      let newState = {
        user: userData,
        userDataPresent: true,
      };

      if (userData) {

        // login event
        analytics.logEvent("login", {
          method: userData.providerData.map(provider => provider.providerId).join(","),
        });


        await firebase.firestore()
          .collection("users")
          .doc(userData.uid)
          .get()
          .then((userDoc) => {
            newState.sound = userDoc.data().sound;
            newState.theme = userDoc.data().theme;
            newState.coloredEdges = userDoc.data().coloredEdges;
          }).catch((error) => {
            newState.sound = true;
            newState.theme = "default";
            newState.coloredEdges = false;
          });
      }
      
      this.setState(newState);
    });
    
    this.cookies = new Cookies();
    this.cookieNotice = document.getElementById("cookie-notice");
    this.root = document.getElementById("root");
    this.cookieNoticeHeight = 0;

    if (this.cookies.get("parandum-cookies-accepted") !== "true") {
      this.cookieNotice.style.display = "flex";
      this.cookieNoticeHeight = this.cookieNotice.offsetHeight;
      this.cookieNotice.animate({
        bottom: [`-${this.cookieNoticeHeight}px`, "0px"],
      }, {
        duration: 1000,
        easing: "ease-in-out",
        iterations: 1,
        fill: "forwards",
      });
      this.root.animate({
        marginBottom: ["0px", `${this.cookieNoticeHeight}px`],
      }, {
        duration: 1000,
        easing: "ease-in-out",
        iterations: 1,
        fill: "forwards",
      });
      window.addEventListener('resize', this.updateCookieNoticeMargins);
    }
  }

  updateCookieNoticeMargins = () => {
    if (this.cookieNoticeHeight !== this.cookieNotice.offsetHeight) {
      this.cookieNoticeHeight = this.cookieNotice.offsetHeight;
      this.root.animate({
        marginBottom: [`${this.root.marginBottom}px`, `${this.cookieNoticeHeight}px`],
      }, {
        duration: 500,
        easing: "ease-in-out",
        iterations: 1,
        fill: "forwards",
      });
    }
  }

  handleThemeChange = (newTheme, globalChange = false) => {
    if (globalChange) firebase.firestore().collection("users")
      .doc(this.state.user.uid)
      .update({
        theme: newTheme,
      });
    this.setState({
      theme: newTheme,
    });
  }

  handleSoundChange = (newSound, globalChange = false) => {
    if (globalChange) firebase.firestore().collection("users")
      .doc(this.state.user.uid)
      .update({
        sound: newSound,
      });
    this.setState({
      sound: newSound,
    });
  }

  handleColoredEdgesChange = (newColoredEdges, globalChange = false) => {
    if (globalChange) firebase.firestore().collection("users")
      .doc(this.state.user.uid)
      .update({
        coloredEdges: newColoredEdges,
      });
    this.setState({
      coloredEdges: newColoredEdges,
    });
  }

  acceptCookies = () => {
    window.removeEventListener('resize', this.updateCookieNoticeMargins);
    this.cookieNoticeHeight = this.cookieNotice.offsetHeight;
    this.cookieNotice.animate({
      bottom: ["0px", `-${this.cookieNoticeHeight}px`],
    }, {
      duration: 1000,
      easing: "ease-in-out",
      iterations: 1,
      fill: "forwards",
    });
    this.root.animate({
      marginBottom: [`${this.cookieNoticeHeight}px`, "0px"],
    }, {
      duration: 1000,
      easing: "ease-in-out",
      iterations: 1,
      fill: "forwards",
    });
    setTimeout(() => this.cookieNotice.style.display = "none", 1000);
    this.cookies.set("parandum-cookies-accepted", "true", {
      maxAge: 31556952,
      path: "/",
    });
  }

  render() {
    return (
      <div className={this.state.theme}>
        <Router>
          <RouteChangeTracker />
          {
            this.state.userDataPresent &&
            (
            this.state.user !== null
            ?
            <>
              <Switch>
                <Route path="/" exact>
                    <LoggedInHome db={db} firebase={firebase} functions={functions} user={this.state.user} logEvent={analytics.logEvent} page={this.page} />
                </Route>
                <Route path="/sets/:setId" exact>
                  <SetPage db={db} functions={functions} user={this.state.user} logEvent={analytics.logEvent} page={this.page} />
                </Route>
                <Route path="/groups" exact>
                  <UserGroups db={db} functions={functions} user={this.state.user} logEvent={analytics.logEvent} page={this.page} />
                </Route>
                <Route path="/groups/:groupId" exact>
                  <GroupPage db={db} functions={functions} user={this.state.user} logEvent={analytics.logEvent} page={this.page} />
                </Route>
                <Route path="/groups/:groupId/stats" exact>
                  <GroupStats db={db} user={this.state.user} logEvent={analytics.logEvent} page={this.page} />
                </Route>
                <Route path="/settings">
                  <Settings db={db} user={this.state.user} sound={this.state.sound} coloredEdges={this.state.coloredEdges} handleColoredEdgesChange={this.handleColoredEdgesChange} handleSoundChange={this.handleSoundChange} theme={this.state.theme} handleThemeChange={this.handleThemeChange} themes={themes} logEvent={analytics.logEvent} page={this.page} />
                </Route>
                <Route path="/progress/:progressId" exact>
                  <Progress db={db} functions={functions} user={this.state.user} sound={this.state.sound} coloredEdges={this.state.coloredEdges} handleColoredEdgesChange={this.handleColoredEdgesChange} handleSoundChange={this.handleSoundChange} theme={this.state.theme} handleThemeChange={this.handleThemeChange} themes={themes} logEvent={analytics.logEvent} page={this.page} />
                  {
                    this.state.coloredEdges &&
                    <div className="colored-edges"></div>
                  }
              </Route>
                <Route path="/create-set" exact>
                  <CreateSet db={db} user={this.state.user} logEvent={analytics.logEvent} page={this.page} />
                </Route>
                <Route path="/my-sets" exact>
                  <UserSets db={db} functions={functions} user={this.state.user} logEvent={analytics.logEvent} page={this.page} />
                </Route>
                <Route path="/sets/:setId/edit" exact>
                  <EditSet db={db} user={this.state.user} logEvent={analytics.logEvent} page={this.page} />
                </Route>
                <Route path="/history" exact>
                  <History db={db} user={this.state.user} logEvent={analytics.logEvent} page={this.page} />
                </Route>
                <Route path="/history/mistakes" exact>
                  <MistakesHistory db={db} user={this.state.user} logEvent={analytics.logEvent} page={this.page} />
                </Route>
                <Route path="/tos" exact>
                  <TermsOfService logEvent={analytics.logEvent} page={this.page} />
                </Route>
                <Route path="/privacy" exact>
                  <PrivacyPolicy logEvent={analytics.logEvent} page={this.page} />
                </Route>
                <Redirect from="/login" to="/" />
                <Route>
                  <Error404 page={this.page} />
                </Route>
              </Switch>
            </>
            :
            <>
              <Switch>
                <Route path="/" exact>
                  <Home logEvent={analytics.logEvent} page={this.page} />
                </Route>
                <Route path="/login">
                    <Login db={db} firebase={firebase} logEvent={analytics.logEvent} user={this.state.user} />
                </Route>
                <Route path="/tos" exact>
                  <TermsOfService logEvent={analytics.logEvent} page={this.page} />
                </Route>
                <Route path="/privacy" exact>
                  <PrivacyPolicy logEvent={analytics.logEvent} page={this.page} />
                </Route>
                <Route>
                  <Error404 page={this.page} />
                </Route>
              </Switch>
            </>
            )
          }
          <div className="cookie-notice" id="cookie-notice">
            <div>
              <p>Just so you know, we use cookies. Read our privacy policy <Link to="/privacy">here</Link>.</p>
              <p></p>
            </div>
            <Button
              onClick={this.acceptCookies}
              icon={<CheckRoundedIcon/>}
              className="button--round"
              title="Accept"
            ></Button>
          </div>
        </Router>
        <Fade out={!this.state.pageLoading && this.state.userDataPresent} className="page-loader-container">
          <img className="page-loader" src={Loader} alt="Loading..." />
        </Fade>
      </div>
    );
  }
}

export default App;
