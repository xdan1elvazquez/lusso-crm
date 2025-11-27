const ErrorState = ({ message = "Algo salió mal." }) => {
  return (
    <div className="text-center py-10">
      <p className="text-red-500">{message}</p>
    </div>
  );
};

export default ErrorState;