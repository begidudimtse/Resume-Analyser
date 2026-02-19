import { Link } from 'react-router'

const Navbar = () => {
   console.log("Navbar component rendered");
  return (
    <nav className="navbar">
      <Link to="/" >
         <p className="text-2xl font-bold text-gradient"> Resume Analyser</p>
      </Link>
      <Link to="/upload" className="primary-button w-fit">
        Upload Resume
      </Link>
    </nav>
  )
}

export default Navbar