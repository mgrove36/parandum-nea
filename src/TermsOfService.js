import React, { useEffect } from "react";
import { HomeRounded as HomeRoundedIcon } from "@material-ui/icons";
import NavBar from "./NavBar";
import Footer from "./Footer";
import { Link } from "react-router-dom";

export default function TermsOfService(props) {
	const navbarItems = [
		{
			type: "link",
			link: "/",
			icon: <HomeRoundedIcon />,
			hideTextMobile: true,
		}
	];

	const page = props.page;
	const logEvent = props.logEvent;

	useEffect(() => {
		if (page) {
			page.load();
			return () => page.unload();
		}
		if (logEvent) logEvent("page_view");
	}, [logEvent, page]);

	return (
		<div>
			<NavBar items={navbarItems} />
			<main>
				<h1>Terms of Service</h1>

				<p>Please read these terms of service ("terms", "terms of service") carefully before using Parandum (the "service") operated by Matthew Grove ("me", 'I", "my").</p>

				<h2>Conditions of Use</h2>

				<p>I will provide the service to you subject to the conditions stated below in this document. Every time you visit this website or use the service, you accept the following conditions. This is why I urge you to read them carefully.</p>

				<h2>Privacy Policy</h2>

				<p>Before you continue using the service I advise you to read the <Link to="/privacy">privacy policy</Link> regarding user data collection. It will help you better understand my practices.</p>

				<h2>Copyright</h2>

				<p>Content published on this website (digital downloads, images, texts, graphics, logos) is the property of Matthew Grove and/or its content creators and protected by international copyright laws. The entire compilation of the content found on this website is the exclusive property of Matthew Grove, with copyright authorship for this compilation by Matthew Grove.</p>

				<h2>Communications</h2>

				<p>The entire communication with me is electronic. Every time you send me an email or visit the service, you are going to be communicating with me. You hereby consent to receive communications from me. I may continue to communicate with you by posting content on the service, sending you emails, and sending push notifications to your devices. You also agree that all notices, disclosures, agreements and other communications I provide to you electronically meet the legal requirements that such communications be in writing.</p>

				<h2>Applicable Law</h2>

				<p>By visiting this website, you agree that the laws of the United Kingdom, without regard to principles of conflict laws, will govern these terms of service, or any dispute of any sort that might come between Matthew Grove and you, or my business partners and associates.</p>

				<h2>Disputes</h2>

				<p>Any dispute related in any way to your visit to the service or communications received from me shall be arbitrated by the United Kingdom courts and you consent to exclusive jurisdiction and venue of such courts.</p>

				<h2>Content and Emails</h2>

				<p>You may post content as long as it is not obscene, illegal, defamatory, threatening, infringing of intellectual property rights, invasive of privacy or injurious in any other way to third parties. Content has to be free of software viruses, political campaign, and commercial solicitation.</p>

				<p>I reserve all rights (but not the obligation) to remove and/or edit any content on the service. When you post your content, you grant Matthew Grove non-exclusive, royalty-free and irrevocable right to use, reproduce, publish, and modify such content throughout the world in any media. By uploading content to the service, you also confirm that you hold copyright permissions for the content, and are permitted to upload it to the service.</p>

				<h2>License and Site Access</h2>

				<p>I grant you a limited license to access and make personal use of this website. You are not allowed to download or modify it beyond the functions provided to you by default on the service. This may be done only with written consent from me.</p>

				<h2>User Account</h2>

				<p>If you are an owner of an account on this website, you are solely responsible for maintaining the confidentiality of your private user details (login details). You are responsible for all activities that occur under your account or password.</p>

				<p>I reserve all rights to terminate accounts (temporarily or permanently) and edit or remove content in my sole discretion.</p>
			</main>
			<Footer />
		</div>
	)
}
