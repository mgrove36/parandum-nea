import React from 'react';
import { Link } from "react-router-dom";
import "./css/NavBar.css";
import Button from "./Button";
import LinkButton from "./LinkButton";

export default function NavBar(props) {
	const navbarItems = props.items;
	return (
		<nav>
			<Link to="/">
				<img className="navbar-logo" id="banner-logo" src={"/banner.png"} alt="Parandum Logo" />
				<img className="navbar-logo" id="small-logo" src={"/logo.png"} alt="Parandum Logo" />
			</Link>

			{ navbarItems ?
				<div className="navbar-items">
					{navbarItems.map((item, index) => {
						if (item.type === "link") {
							return <LinkButton className={`${item.hideTextMobile ? "button--hide-text-mobile" : ""} ${item.icon && !item.name ? "button--round" : ""}`} key={index} to={item.link} icon={item.icon}>{item.name}</LinkButton>
						} else if (item.type === "button") {
							return <Button className={`${item.hideTextMobile ? "button--hide-text-mobile" : ""} ${item.icon && !item.name ? "button--round" : ""}`} key={index} onClick={item.onClick} icon={item.icon}>{item.name}</Button>
						}
						return false;
					})}
				</div>
				:
				""
			}
		</nav>
	)
}
