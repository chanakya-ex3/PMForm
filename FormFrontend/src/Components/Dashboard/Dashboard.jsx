import React, { useEffect } from 'react'
import Login from '../Login/Login';
import DashboardData from '../DashboardData/DashboardData';

const apiUrl = import.meta.env.VITE_API_URL;

const Dashboard = () => {
    const logout = () => {
        localStorage.removeItem('token');
        window.location.reload();
    }

    useEffect(() => {
        const checkAuth = async () => {
            const response = await fetch(`${apiUrl}auth-check`, {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `${localStorage.getItem('token')}`,
                },
            });
            if (response.status !== 200) {
                localStorage.removeItem('token');
            }
        };
        checkAuth();
    }, []);

    return (
        <div className="min-h-screen">
            {localStorage.getItem('token') ? (
                <div >
                    {/* App Bar */}
                    <div className="fixed top-0 left-0 right-0 p-4 bg-violet-400 shadow-md flex justify-between items-center z-50">
                        <p className="font-bold text-white">Form App</p>
                        <button onClick={logout} className="bg-red-500 hover:bg-red-600 p-2 rounded text-white">
                            Logout
                        </button>
                    </div>

                    {/* Spacer for App Bar height */}
                    <div className="h-[70px]" />

                    {/* Content */}
                    <div className="w-[100vw] max-w-6xl mx-auto px-4 ">
                        <DashboardData />
                    </div>
                </div>
            ) : (
                <Login />
            )}
        </div>
    )
}

export default Dashboard;
