type Props = {
  params: { orderId: string };
};

export default function ResultPage({ params }: Props) {
  return (
    <main className="container mx-auto px-4 py-8 max-w-lg">
      <p className="mb-4">
        Your reading is being prepared. Check your email shortly.
      </p>
      <p className="text-sm text-gray-600">
        Order ID: <span className="font-mono break-all">{params.orderId}</span>
      </p>
    </main>
  );
}
