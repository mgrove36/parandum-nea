import { withRouter } from "react-router-dom";

export default withRouter(function RouteChangeTracker({ history }) {
	history.listen((location, action) => {
		if (location.pathname === "/login") {
			document.body.style.overflow = "hidden";
		} else {
			document.body.style.overflow = "auto";
		}
	});
	
	return null;
})
