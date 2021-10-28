import React, { useEffect } from "react";
import { HomeRounded as HomeRoundedIcon } from "@material-ui/icons";
import NavBar from "./NavBar";
import Footer from "./Footer";

export default function PrivacyPolicy(props) {
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
				<h1>Privacy Policy</h1>

				<p>Last updated 29/08/2021</p>

				<h2>Introduction</h2>

				<p>The Parandum Team (Matthew Grove) ("we" or "us" or "our") respects the privacy of our users ("user" or "you"). This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you visit our website parandum.mgrove.uk, including any other media form, media channel, mobile website, or mobile application related or connected thereto (collectively, the "Site"). Please read this privacy policy carefully. If you do not agree with the terms of this privacy policy, please do not access the site.</p>

				<p>We reserve the right to make changes to this Privacy Policy at any time and for any reason. We will alert you about any changes by updating the "Last Updated" date of this Privacy Policy. Any changes or modifications will be effective immediately upon posting the updated Privacy Policy on the Site, and you waive the right to receive specific notice of each such change or modification.</p>

				<p>You are encouraged to periodically review this Privacy Policy to stay informed of updates. You will be deemed to have been made aware of, will be subject to, and will be deemed to have accepted the changes in any revised Privacy Policy by your continued use of the Site after the date such revised Privacy Policy is posted.</p>

				<h2>Collection of Your Information</h2>

				<p>We may collect information about you in a variety of ways. The information we may collect on the Site includes:</p>

				<h3>Personal Data</h3>
				
				<p>Personally identifiable information, such as your name, email address, and telephone number, and demographic information, such as your age, gender, hometown, and interests, that you voluntarily give to us when you register with the Site or when you choose to participate in various activities related to the Site. You are under no obligation to provide us with personal information of any kind, however your refusal to do so may prevent you from using certain features of the Site.</p>

				<h3>Derivative Data</h3>

				<p>Information our servers automatically collect when you access the Site, such as your IP address, your browser type, your operating system, your access times, and the pages you have viewed directly before and after accessing the Site.</p>

				<h3>Data From Social Networks</h3>

				<p>User information from social networking sites, such as Google and Microsoft, including your name, your social network username, location, gender, birth date, email address, profile picture, and public data for contacts, if you connect your account to such social networks.</p>

				<h3>Mobile Device Data</h3>

				<p>Device information, such as your mobile device ID, model, and manufacturer, and information about the location of your device, if you access the Site from a mobile device.</p>

				<h3>Third-Party Data</h3>

				<p>Information from third parties, such as personal information or network friends, if you connect your account to the third party and grant the Site permission to access this information.</p>

				<h3>Data From Contests, Giveaways, and Surveys</h3>
				
				<p>Personal and other information you may provide when entering contests or giveaways and/or responding to surveys.</p>

				<h3>Push Notifications</h3>

				<p>We may request to send you push notifications regarding your account or the Application. If you wish to opt-out from receiving these types of communications, you may turn them off in your device&rsquo;s settings.</p>

				<h3>Geo-Location Information</h3>

				<p>We may request access or permission to and track location-based information from your mobile device, either continuously or while you are using our mobile application, to provide location-based services. If you wish to change our access or permissions, you may do so in your device&rsquo;s settings.</p>

				<h2>Use of Your Information</h2>

				<p>Having accurate information about you permits us to provide you with a smooth, efficient, and customized experience. Specifically, we may use information collected about you via the Site to:</p>

				<ul>
					<li>Administer sweepstakes, promotions, and contests.</li>
					<li>Assist law enforcement and respond to subpoena.</li>
					<li>Compile anonymous statistical data and analysis for use internally or with third parties.</li>
					<li>Create and manage your account.</li>
					<li>Deliver targeted advertising, coupons, newsletters, and other information regarding promotions and the Site to you.</li>
					<li>Email you regarding your account or order.</li>
					<li>Enable user-to-user communications.</li>
					<li>Generate a personal profile about you to make future visits to the Site more personalized.</li>
					<li>Increase the efficiency and operation of the Site.</li>
					<li>Monitor and analyze usage and trends to improve your experience with the Site.</li>
					<li>Notify you of updates to the Site.</li>
					<li>Offer new products, services, and/or recommendations to you.</li>
					<li>Perform other business activities as needed.</li>
					<li>Request feedback and contact you about your use of the Site.</li>
					<li>Resolve disputes and troubleshoot problems.</li>
					<li>Respond to product and customer service requests.</li>
					<li>Send you a communications (emails and push notifications).</li>
					<li>Solicit support for the Site.</li>
				</ul>

				<h2>Disclosure of Your Information</h2>

				<p>We may share information we have collected about you in certain situations. Your information may be disclosed as follows:</p>

				<h3>By Law or to Protect Rights</h3>

				<p>If we believe the release of information about you is necessary to respond to legal process, to investigate or remedy potential violations of our policies, or to protect the rights, property, and safety of others, we may share your information as permitted or required by any applicable law, rule, or regulation. This includes exchanging information with other entities for fraud protection.</p>

				<h3>Third-Party Service Providers</h3>
				
				<p>We may share your information with third parties that perform services for us or on our behalf, including payment processing, data analysis, email delivery, hosting services, customer service, and marketing assistance.</p>

				<h3>Marketing Communications</h3>

				<p>With your consent, or with an opportunity for you to withdraw consent, we may share your information with third parties for marketing purposes, as permitted by law.</p>

				<h3>Interactions with Other Users</h3>

				<p>If you interact with other users of the Site, those users may see your name, profile photo, and descriptions of your activity.</p>

				<h3>Online Postings</h3>

				<p>When you post content to the Site, the content may be viewed by all users and may be publicly distributed outside the Site in perpetuity.</p>

				<h3>Third-Party Advertisers</h3>

				<p>We may use third-party advertising companies to serve ads when you visit the Site. These companies may use information about your visits to the Site and other websites that are contained in web cookies in order to provide advertisements about goods and services of interest to you.</p>

				<h3>Affiliates</h3>
				
				<p>We may share your information with our affiliates, in which case we will require those affiliates to honor this Privacy Policy. Affiliates include our parent companies and any subsidiaries, joint venture partners or other companies that we control or that are under common control with us.</p>

				<h3>Business Partners</h3>

				<p>We may share your information with our business partners to offer you certain products, services or promotions.</p>

				<h3>Other Third Parties</h3>
				
				<p>We may share your information with advertisers and investors for the purpose of conducting general business analysis. We may also share your information with such third parties for marketing purposes, as permitted by law.</p>

				<h3>Sale or Bankruptcy</h3>

				<p>If we reorganize or sell all or a portion of our assets, undergo a merger, or are acquired by another entity, we may transfer your information to the successor entity. If we go out of business or enter bankruptcy, your information would be an asset transferred or acquired by a third party. You acknowledge that such transfers may occur and that the transferee may decline honor commitments we made in this Privacy Policy.</p>

				<p>We are not responsible for the actions of third parties with whom you share personal or sensitive data, and we have no authority to manage or control third-party solicitations. If you no longer wish to receive correspondence, emails or other communications from third parties, you are responsible for contacting the third party directly.</p>

				<h2>Tracking Technologies</h2>
				
				<h3>Cookies and Web Beacons</h3>

				<p>We may use cookies, web beacons, tracking pixels, and other tracking technologies on the Site to help customize the Site and improve your experience. When you access the Site, your personal information is not collected through the use of tracking technology. Most browsers are set to accept cookies by default. You can remove or reject cookies, but be aware that such action could affect the availability and functionality of the Site. You may not decline web beacons. However, they can be rendered ineffective by declining all cookies or by modifying your web browser&rsquo;s settings to notify you each time a cookie is tendered, permitting you to accept or decline cookies on an individual basis.</p>

				<p>We may use cookies, web beacons, tracking pixels, and other tracking technologies on the Site to help customize the Site and improve your experience. For more information on how we use cookies, please refer to our Cookie Policy posted on the Site, which is incorporated into this Privacy Policy. By using the Site, you agree to be bound by our Cookie Policy.</p>

				<h3>Internet-Based Advertising</h3>

				<p>Additionally, we may use third-party software to serve ads on the Site, implement email marketing campaigns, and manage other interactive marketing initiatives. This third-party software may use cookies or similar tracking technology to help manage and optimize your online experience with us. For more information about opting-out of interest-based ads, visit the <a href="http://www.networkadvertising.org/choices/">Network Advertising Initiative Opt-Out Tool</a> or <a href="http://www.aboutads.info/choices/">Digital Advertising Alliance Opt-Out Tool</a>.</p>

				<h3>Website Analytics</h3>
				
				<p>We may also partner with selected third-party vendors, such as <a href="https://www.cloudflare.com/security-policy/">Cloudfare</a>, <a href="https://support.google.com/analytics/answer/6004245?hl=en">Google Analytics</a>, and others, to allow tracking technologies and remarketing services on the Site through the use of first party cookies and third-party cookies, to, among other things, analyze and track users&rsquo; use of the Site, determine the popularity of certain content and better understand online activity. By accessing the Site, you consent to the collection and use of your information by these third-party vendors. You are encouraged to review their privacy policy and contact them directly for responses to your questions. We do not transfer personal information to these third-party vendors. However, if you do not want any information to be collected and used by tracking technologies, you can visit the third-party vendor or the <a href="http://www.networkadvertising.org/choices/">Network Advertising Initiative Opt-Out Tool</a> or <a href="http://www.aboutads.info/choices/">Digital Advertising Alliance Opt-Out Tool</a>.</p>
				
				<p>You should be aware that getting a new computer, installing a new browser, upgrading an existing browser, or erasing or otherwise altering your browser&rsquo;s cookies files may also clear certain opt-out cookies, plug-ins, or settings.</p>
				
				<h2>Third-Party Websites</h2>

				<p>The Site may contain links to third-party websites and applications of interest, including advertisements and external services, that are not affiliated with us. Once you have used these links to leave the Site, any information you provide to these third parties is not covered by this Privacy Policy, and we cannot guarantee the safety and privacy of your information. Before visiting and providing any information to any third-party websites, you should inform yourself of the privacy policies and practices (if any) of the third party responsible for that website, and should take those steps necessary to, in your discretion, protect the privacy of your information. We are not responsible for the content or privacy and security practices and policies of any third parties, including other sites, services or applications that may be linked to or from the Site.</p>

				<h2>Security of Your Information</h2>

				<p>We use administrative, technical, and physical security measures to help protect your personal information. While we have taken reasonable steps to secure the personal information you provide to us, please be aware that despite our efforts, no security measures are perfect or impenetrable, and no method of data transmission can be guaranteed against any interception or other type of misuse. Any information disclosed online is vulnerable to interception and misuse by unauthorized parties. Therefore, we cannot guarantee complete security if you provide personal information.</p>

				<h2>Policy For Children</h2>

				<p>We do not knowingly solicit marketing information from or market to children under the age of 13. If you become aware of any such data we have collected from children under age 13, please contact us using the contact information provided below.</p>

				<h2>Controls For Do-Not-Track Features</h2>

				<p>Most web browsers and some mobile operating systems include a Do-Not-Track ("DNT") feature or setting you can activate to signal your privacy preference not to have data about your online browsing activities monitored and collected. No uniform technology standard for recognizing and implementing DNT signals has been finalized. As such, we do not currently respond to DNT browser signals or any other mechanism that automatically communicates your choice not to be tracked online. If a standard for online tracking is adopted that we must follow in the future, we will inform you about that practice in a revised version of this Privacy Policy. Most web browsers and some mobile operating systems include a Do-Not-Track ("DNT") feature or setting you can activate to signal your privacy preference not to have data about your online browsing activities monitored and collected. If you set the DNT signal on your browser, we may respond to such DNT browser signals.</p>

				<h2>Options Regarding Your Information</h2>

				<h3>Account Information</h3>

				<p>You may at any time review or change the information in your account or terminate your account by:</p>
				
				<ul>
					<li>Contacting us using the contact information provided below.</li>
				</ul>
				
				<p>Upon your request to terminate your account, we will deactivate or delete your account and personal information from our active databases. However, some information may be retained in our files to prevent fraud, troubleshoot problems, assist with any investigations, enforce our Terms of Use and/or comply with legal requirements.</p>

				<h3>Emails and Communications</h3>

				<p>If you no longer wish to receive correspondence, emails, or other communications from us, you may opt-out by:</p>
				
				<ul>
					<li>Contacting us using the contact information provided below.</li>
				</ul>
				
				<p>If you no longer wish to receive correspondence, emails, or other communications from third parties, you are responsible for contacting the third party directly.</p>

				<h2>California Privacy Rights</h2>

				<p>California Civil Code Section 1798.83, also known as the "Shine The Light" law, permits our users who are California residents to request and obtain from us, once a year and free of charge, information about categories of personal information (if any) we disclosed to third parties for direct marketing purposes and the names and addresses of all third parties with which we shared personal information in the immediately preceding calendar year. If you are a California resident and would like to make such a request, please submit your request in writing to us using the contact information provided below.</p>

				<p>If you are under 18 years of age, reside in California, and have a registered account with the Site, you have the right to request removal of unwanted data that you publicly post on the Site. To request removal of such data, please contact us using the contact information provided below, and include the email address associated with your account and a statement that you reside in California. We will make sure the data is not publicly displayed on the Site, but please be aware that the data may not be completely or comprehensively removed from our systems.</p>

				<h2>Use of Cookies</h2>

				<p>A "cookie" is a string of information which assigns you a unique identifier that we store on your computer. Your browser then provides that unique identifier to use each time you submit a query to the Site. We use cookies on the Site to, among other things, keep track of services you have used, record registration information, record your user preferences, keep you logged into the Site, facilitate purchase procedures, and track the pages you visit. Cookies help us understand how the Site is being used and improve your user experience.</p>

				<h2>Types of Cookies</h2>
				
				<p>The following types of cookies may be used when you visit the Site:</p>

				<h3>Advertising Cookies</h3>

				<p>Advertising cookies are placed on your computer by advertisers and ad servers in order to display advertisements that are most likely to be of interest to you. These cookies allow advertisers and ad servers to gather information about your visits to the Site and other websites, alternate the ads sent to a specific computer, and track how often an ad has been viewed and by whom. These cookies are linked to a computer and do not gather any personal information about you.</p>

				<h3>Analytics Cookies</h3>

				<p>Analytics cookies monitor how users reached the Site, and how they interact with and move around once on the Site. These cookies let us know what features on the Site are working the best and what features on the Site can be improved.</p>

				<h3>Our Cookies</h3>

				<p>Our cookies are "first-party cookies", and can be either permanent or temporary. These are necessary cookies, without some of which the Site won't work properly or be able to provide certain features and functionalities. Some of these may be manually disabled in your browser, but may affect the functionality of the Site.</p>

				<h3>Personalization Cookies</h3>

				<p>Personalization cookies are used to recognize repeat visitors to the Site. We use these cookies to record your browsing history, the pages you have visited, and your settings and preferences each time you visit the Site.</p>

				<h3>Security Cookies</h3>

				<p>Security cookies help identify and prevent security risks. We use these cookies to authenticate users and protect user data from unauthorized parties.</p>

				<h3>Site Management Cookies</h3>

				<p>Site management cookies are used to maintain your identity or session on the Site so that you are not logged off unexpectedly, and any information you enter is retained from page to page. These cookies cannot be turned off individually, but you can disable all cookies in your browser.</p>

				<h3>Third-Party Cookies</h3>

				<p>Third-party cookies may be place on your computer when you visit the Site by companies that run certain services we offer. These cookies allow the third parties to gather and track certain information about you. These cookies can be manually disabled in your browser.</p>

				<h2>Contact Us</h2>

				<p>If you have questions or comments about this Privacy Policy, please contact us at <a href="mailto:parandum@mgrove.uk">parandum@mgrove.uk</a></p>
			</main>
			<Footer />
		</div>
	)
}
