import { FcGoogle } from "react-icons/fc";
import ShineBorder from "../ui/shine-border";
import { useGoogleLogin } from "@react-oauth/google";
import { oAuthLogin } from "@/api/user";
import { useNavigate } from "react-router-dom";
import { toast } from "react-toastify";

const GoogleAuthButton = ({ signIn }) => {
  const navigate = useNavigate();

  const FetchUserData = async (response) => {
    try {
      if (response.code) {
        const code = response.code
        await oAuthLogin(code)

        navigate("/");
      }
    } catch (error) {
      toast.error(error.response?.data?.message || "Google sign-in could not be completed");
    }
  }

  const googleLogin = useGoogleLogin({
    onSuccess: FetchUserData,
    onError: () => toast.error("Google sign-in was cancelled or failed"),
    flow: "auth-code",
    scope: "openid email profile",
  })

  return (
    <div onClick={() => googleLogin()} role="button" tabIndex={0} onKeyDown={(event) => event.key === "Enter" && googleLogin()}>
      <ShineBorder
        className="flex w-full justify-center items-center gap-x-2 bg-[#27272A] rounded-3xl px-8 py-3 min-h-fit cursor-pointer" color={["#A07CFE", "#FE8FB5", "#FFBE7B"]}
      >
        <FcGoogle className="text-xl" />
        <span className="text-lg">{signIn ? "Login" : "Signup"} with Google</span>
      </ShineBorder>
    </div>
  );
};

export default GoogleAuthButton;
