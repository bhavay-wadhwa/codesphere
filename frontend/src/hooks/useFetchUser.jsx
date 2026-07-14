import { useLocation } from "react-router-dom";
import { useDispatch } from "react-redux";
import { setUserObj } from "../features/Profile/profileSlice.js";
import { useEffect, useRef, useState } from "react";
import { getUser } from "../api/user.js";

export function useFetchUser() {
    const location = useLocation();
    const dispatch = useDispatch();
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [isLoading, setIsLoading] = useState(true);
    const isInitialLoad = useRef(true);

    useEffect(() => {
        const fetchUser = async () => {
            if (isInitialLoad.current) {
                setIsLoading(true);
            }

            const res = await getUser();
            if (!res) {
                setIsAuthenticated(false);
                setIsLoading(false);
                isInitialLoad.current = false;
                return;
            }

            let data = {
                _id: res?.user?._id ?? "",
                firstName: res?.user?.firstName ?? "",
                lastName: res?.user?.lastName ?? "",
                email: res?.user?.email ?? "",
                about: res?.user?.about ?? "",
                imageUrl: res?.user?.imageUrl ?? "",
                googleId: res?.user?.googleId ?? "",
                createdAt: res?.user?.createdAt ?? "",
                rooms: res?.user?.rooms ?? []
            }

            setIsAuthenticated(true);
            dispatch(setUserObj(data));
            setIsLoading(false);
            isInitialLoad.current = false;
        };

        fetchUser();
    }, [location, dispatch]);

    return { isAuthenticated, isLoading };
}