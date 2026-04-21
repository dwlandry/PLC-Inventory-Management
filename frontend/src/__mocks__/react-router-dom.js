const React = require('react');

const BrowserRouter = ({ children }) => React.createElement(React.Fragment, null, children);
const Routes = ({ children }) => React.createElement(React.Fragment, null, children);
const Route = () => null;
const Link = ({ children }) => React.createElement(React.Fragment, null, children);
const NavLink = ({ children }) => React.createElement(React.Fragment, null, children);
const Outlet = () => null;
const useNavigate = () => () => {};
const useParams = () => ({});
const useLocation = () => ({ pathname: '/' });
const useSearchParams = () => [new URLSearchParams(), () => {}];

module.exports = {
  BrowserRouter,
  Routes,
  Route,
  Link,
  NavLink,
  Outlet,
  useNavigate,
  useParams,
  useLocation,
  useSearchParams,
};
