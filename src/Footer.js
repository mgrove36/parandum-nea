import React from "react";
import { Link } from "react-router-dom";

export default function Footer(props) {
	return (
		<footer>
			<span>&copy; Matthew Grove {new Date().getFullYear()}</span>
			{
				props.showTerms &&
				<>
					<Link to="/tos">Terms of service</Link>
					<Link to="/privacy">Privacy policy</Link>
				</>
			}
		</footer>
	)
}
