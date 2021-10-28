import React, { useEffect } from "react";
import Home from './Home';
import StyledFirebaseAuth from 'react-firebaseui/StyledFirebaseAuth';
import "./css/Login.css";
import "./css/PopUp.css";
import { Link } from 'react-router-dom';
import "@material-ui/core";
import { CloseRounded as CloseRoundedIcon } from "@material-ui/icons";

import "firebase/auth";

export default function Login(props) {
	const uiConfig = {
		signInFlow: 'redirect',
		signInSuccessUrl: '/',
		signInOptions: [
			props.firebase.auth.GoogleAuthProvider.PROVIDER_ID,
			"microsoft.com",
			props.firebase.auth.EmailAuthProvider.PROVIDER_ID
		],
		callbacks: {
			signInSuccessWithAuthResult: () => false,
		},
	};
	
	document.title = "Login | Parandum";

	const logEvent = props.logEvent;

	useEffect(() => {
		if (logEvent) logEvent("page_view");
	}, [logEvent]);

	return (
		<>
			<Home />
			<Link to="/" className="overlay"></Link>
			<div className="overlay-content login-overlay-content">
				<h1>Login</h1>
				<StyledFirebaseAuth uiConfig={uiConfig} firebaseAuth={props.firebase.auth()} />
				<Link className="popup-close-button" to="/">
					<CloseRoundedIcon />
				</Link>
			</div>
		</>
	)
}
