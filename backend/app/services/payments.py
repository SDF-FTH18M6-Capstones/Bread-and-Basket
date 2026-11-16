from abc import ABC, abstractmethod
import string
import secrets


class PaymentGateway(ABC):
    @abstractmethod
    def charge(self, phone, amount) -> str:
        # charges the user
        pass


class SimulatedMpesaGateway(PaymentGateway):
    PREFIX = "QG"
    ALLOWED = string.ascii_uppercase + string.digits
    LENGTH = 8

    def charge(self, phone, amount) -> str:
        suffix = "".join(secrets.choice(self.ALLOWED) for _ in range(self.LENGTH))
        return f"{self.PREFIX}{suffix}"
