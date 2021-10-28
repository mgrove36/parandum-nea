import React, { useEffect } from 'react';
import NavBar from './NavBar';
import Footer from "./Footer";
import { HomeRounded as HomeRoundedIcon } from "@material-ui/icons";

export default function PageNotFound(props) {
	const navbarItems = [
		{
			type: "link",
			link: "/",
			icon: <HomeRoundedIcon />,
			hideTextMobile: true,
		}
	];

	document.title = "Error 404 | Parandum";

	const page = props.page;

	useEffect(() => {
		if (page) {
			page.load();
			return () => page.unload();
		}
	}, [page]);

	return (
		(typeof page === "undefined" || !page.loaded)
		?
		<div>
			<NavBar items={navbarItems}/>
			<main>
				<h1>Error 404</h1>
				<h3>Sorry, but we can't find that page.</h3>
			</main>
			<Footer />
		</div>
		:
		null
	)
}
